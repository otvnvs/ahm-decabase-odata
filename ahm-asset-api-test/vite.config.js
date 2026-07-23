//--------------------------------------------------------------------------------
//qr should work in linux and mac
//--------------------------------------------------------------------------------
//// vite.config.js
//import { defineConfig } from 'vite';
//import vue from '@vitejs/plugin-vue';
//import { qrcode } from 'vite-plugin-qrcode'; // 1. Register the module hook
//
//export default defineConfig({
//  base: './',
//  plugins: [
//    vue(),
//    qrcode() // 2. Inject the generator rule into the development cycle
//  ],
//  server: {
//    port: 3000,
//    cors: true,
//    host: true // 3. Exposes the live dev server to your local network (LAN)
//  },
//  preview: {
//    port: 3000,
//    host: true // 4. Exposes the production preview engine to your local network (LAN)
//  },
//  build: {
//    outDir: 'dist'
//  }
//});
//--------------------------------------------------------------------------------
//dealing with wsl you have to find an alternative way to get the IP
//--------------------------------------------------------------------------------
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Parses raw Windows ipconfig streams line-by-line inside WSL.
 * Targets the true physical host network adapter by filtering out virtual subnets.
 */
function getWslHostIp() {
  try {
    const isWsl = fs.existsSync('/proc/version') && 
                  fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
    
    if (isWsl) {
      const stdout = execSync('cmd.exe /c ipconfig').toString();
      const lines = stdout.split(/\r?\n/);
      let activeIp = null;

      for (const line of lines) {
        if (line.includes('IPv4 Address')) {
          const match = line.match(/:\s*([0-9\.]+)/);
          if (match && match[1]) {
            const foundIp = match[1].trim();
            // Skip the internal virtual WSL container hypervisor switch subnet
            if (foundIp.startsWith('172.') || foundIp.startsWith('127.')) {
              continue;
            }
            activeIp = foundIp;
          }
        }
      }
      return activeIp;
    }
  } catch (err) {
    console.warn('[WSL Network Hook] Could not map Windows host network profiles:', err.message);
  }
  return null;
}

const windowsHostIp = getWslHostIp();

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    
    // Direct console logger interceptor plugin configuration
    {
      name: 'wsl-terminal-qr-override',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          setTimeout(() => {
            const devPort = server.config.server.port || 3000;
            // Fallback gracefully to your verified IP address if parsing maps change
            const resolvedTargetIp = windowsHostIp || '192.168.0.31'; 
            const targetMobileUrl = `http://${resolvedTargetIp}:${devPort}/`;
            
            console.log('\n┌────────────────────────────────────────────────────────────┐');
            console.log(`│ 📱 WSL MOBILE DEV LINK ENABLED                             │`);
            console.log(`│ Target Host IP: ${resolvedTargetIp}                        │`);
            console.log(`│ URL Endpoint:   ${targetMobileUrl}                  │`);
            console.log('└────────────────────────────────────────────────────────────┘\n');
            
            try {
              // Execute the native Linux utility tool that generated the working layout
              // We pass '-t utf8' to enable half-block line packing architecture
              execSync(`qrencode -t utf8 "${targetMobileUrl}"`, { stdio: 'inherit' });
              console.log('\n'); // Append clean trailing block space lines
            } catch (qrError) {
              console.warn('[WSL QR Generator] Native qrencode utility execution failed.');
              console.log(`Fallback Link URL: ${targetMobileUrl}\n`);
            }
            
          }, 200); // Triggers right after Vite writes out its standard help lines
        });
      }
    }
  ],
  server: {
    port: 3000,
    cors: true,
    host: '0.0.0.0' // Listens on all internal WSL networking interfaces
  },
  preview: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist'
  }
});

