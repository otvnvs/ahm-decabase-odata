# Android WebView Native API Documentation

This document lists all intercepted native endpoints available to the WebView application running under the custom mock domain environment.

---

## 1. Application & System Services (`AppController`)

### `POST /api/app/export-localstorage`
*   **Description:** Serializes and dumps a raw string data packet or JSON string from the web environment directly into a backup file named `ahm-localstorage-dump.json` inside the shared public Android Downloads directory.
*   **Query Parameters:** None.
*   **Request Body:** `application/json` or raw text data packet strings (cannot be empty).
*   **Response Status:** 
    *   `200 OK` (On successful write)
    *   `400 Bad Request` (If payload packet is empty)
    *   `500 Internal Server Error` (If writing to external disk fails)
*   **Response Headers:** `Content-Type: text/plain`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Exported to downloads: ahm-localstorage-dump.json"
    }
    ```

### `GET /api/app/import-localstorage`
*   **Description:** Accesses the Android Downloads folder to locate and read back the raw bytes of the `ahm-localstorage-dump.json` storage file to restore state.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (On successful read)
    *   `404 Not Found` (If the backup file does not exist in Downloads)
    *   `500 Internal Server Error` (If file streaming hits an I/O exception)
*   **Response Headers:** `Cache-Control: no-cache`
*   **Response Body:** Returns raw byte contents or a serialized JSON string matching the original exported payload. If an error occurs:
    ```json
    {
      "status": "error",
      "message": "Backup file 'ahm-localstorage-dump.json' not found in Downloads folder."
    }
    ```

### `GET /api/app/device-status`
*   **Description:** Fetches structural diagnostic properties of the active environment wrapper context including user-agent strings, protocols, and mock tracking domain metadata.
*   **Query Parameters:**
    *   `id` (Optional) - Appends a requested client identifier into the JSON payload tracking tracking model.
*   **Request Body:** None.
*   **Response Status:** `200 OK`
*   **Response Headers:** `X-Powered-By: Android Native Framework Interceptor`
*   **Response Body:**
    ```json
    {
      "status": "active",
      "protocol": "HTTP/1.1",
      "userAgent": "Mozilla/5.0 ...",
      "domain": "your-mock-domain.local",
      "requestedId": "mobile_client"
    }
    ```

---

## 2. Persistent Local File System Storage (`FsController`)

File system operations start at the root of either internal Application static storage, sandbox, or device storage at `/storage/emulated/0` as returned by `Environment.getExternalStorageDirectory()`

### `GET /api/fs/list`
*   **Description:** Lists the explicit files and directory contents array for a targeted location relative to the storage environment root.
*   **Query Parameters:**
    *   `path` (Required) - Target directory subdirectory mapping string.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `400 Bad Request` (If path resolution or directory traversal rules fail)
*   **Response Headers:** `Content-Type: text/plain`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "files": ["manifest.json", "assets", "configurations"]
    }
    ```

### `GET /api/fs/read`
*   **Description:** Extracts the complete uncompressed file contents matching localized extensions (`.txt`, `.json`) into designated buffer outputs.
*   **Query Parameters:**
    *   `path` (Required) - Target local filesystem path to read.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `404 Not Found` (If file path processing throws structural file exceptions)
*   **Response Headers:** Dynamically converted depending on target extension:
    *   `.txt` → `Content-Type: text/plain`
    *   `.json` → `Content-Type: application/json`
    *   Default → `Content-Type: application/octet-stream`
*   **Response Body:** Raw uncompressed byte string array matching target payload.

### `GET /api/fs/locations`
*   **Description:** Dynamically resolves the true absolute file system path strings for the device shared external storage root and the private application sandbox databases folder.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `500 Internal Server Error` (If context processing or system path routing fails)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "locations": {
        "external_storage_root": "/storage/emulated/0",
        "sandbox_databases_root": "/data/user/0/com.example.app/databases",
        "package_name": "com.example.app"
      }
    }
    ```
### `GET /api/fs/diskspace`
*   **Description:** Extracts real-time hardware storage allocations, structural block partition availability, app sandbox cache footprints, and active secondary Micro-SD external storage mount variables.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `500 Internal Server Error` (If native hardware partition query mechanics or sandbox cache scans fail)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "internal_partition": {
        "partition_path": "/data",
        "total_space_bytes": 113432854528,
        "available_space_bytes": 38783815680,
        "status": "success"
      },
      "secondary_partition": {
        "removable_sdcard_mounted": false,
        "partition_path": "unmounted",
        "total_space_bytes": 0,
        "available_space_bytes": 0
      },
      "app_sandbox_cache": {
        "sandbox_cache_path": "/data/user/0/com.example.app/cache",
        "active_cache_usage_bytes": 63522,
        "status": "success"
      }
    }
    ```

File system operations start at the root of either internal Application static storage, sandbox, or device storage at `/storage/emulated/0` as returned by `Environment.getExternalStorageDirectory()`

### `POST /api/fs/mkdir`
*   **Description:** Requests the native layer file service engine initialization helper to construct a directory path workspace.
*   **Query Parameters:**
    *   `path` (Required) - Path layout structure string to build.
    *   `recursive` (Optional) - Pass `"true"` to force-generate nested missing parents.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success matched or generated layout)
    *   `400 Bad Request` (Invalid path or safety violation check)
    *   `500 Internal Server Error` (Structural write block failure)
*   **Response Headers:** `Content-Type: text/plain`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Directory matched/created."
    }
    ```

### `POST /api/fs/write`
*   **Description:** Persists plain UTF-8 encoded text or stringified JSON arguments directly into an explicitly targeted filesystem location on the device.
*   **Query Parameters:**
    *   `path` (Required) - The destination file path relative to the root directory (must be URL-encoded).
*   **Request Body:** The raw content string or payload buffer to commit directly to the file on the device flash sectors.
*   **Response Status:**
    *   `200 OK` (Successfully saved to disk)
    *   `500 Internal Server Error` (File persisting runtime layer failures or write execution drops)
*   **Response Headers:**
    *   `Content-Type: application/json` (Outbound Response)
*   **Response Body:**
    ```json
    {
      "status": "success"
    }
    ```


### `DELETE /api/fs/delete`
*   **Description:** Purges file targets or directory trees cleanly. Rejects requests targeting the absolute sandbox directory system root for protection.
*   **Query Parameters:**
    *   `path` (Required) - Asset directory file node targeted for removal.
    *   `recursive` (Optional) - Pass `"true"` to remove directories containing active structures.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Clean deletion execution)
    *   `403 Forbidden` (If targeted path matches storage context environment root)
    *   `400 Bad Request` / `500 Internal Server Error` (Resource blocking errors)
*   **Response Headers:** `Content-Type: text/plain`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Deleted resource cleanly."
    }
    ```

## 3. Maintenance, Hot Deployments & Application Lifecycle (`MaintenanceController`)

File system operations start at the root of either internal Application static storage, sandbox, or device storage at `/storage/emulated/0` as returned by `Environment.getExternalStorageDirectory()`

### `GET /api/maintenance/config`
*   **Description:** Retrieves the dynamic JSON parameters string profile containing system maintenance constraints and active variable properties.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:** `200 OK`
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:** String containing system configuration profiles.
    ```json
    {
      "autoUpdate": "false",
      "interval": "1800",
      "url": "https://server.com",
      "useAuth": "false"
    }
    ```

### `POST /api/maintenance/save`
*   **Description:** Overwrites and persists new tracking properties into the global application configurations module space.
*   **Query Parameters:**
    *   `autoUpdate`, `interval`, `url`, `useAuth`, `user`, `pass`, `subpath` (All optional configuration values matching tracking criteria)
*   **Request Body:** None.
*   **Response Status:** `200 OK`
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Settings saved cleanly."
    }
    ```

### `POST /api/maintenance/download`
*   **Description:** Launches a separate native background execution thread task block that communicates over standard networks to fetch remote updates, execute over-write configurations, unpack resources into the local browser sandbox (`www`), and duplicate copies into public documents partitions. Forces a UI-thread application Webview reload upon completion.
*   **Query Parameters:**
    *   `merge` (Optional) - Pass `"true"` to skip asset pre-purging; else cleanly overwrites older instances.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Background worker thread successfully spawned)
    *   `500 Internal Server Error` (If context framework verification steps fail)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Asynchronous flattened execution thread processing pipeline launched successfully."
    }
    ```

### `POST /api/maintenance/sync-sd`
*   **Description:** Fires off programmatic calls into background system storage manager modules to execute sandbox backup copy commands onto an active SD card or secondary persistent partition context.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:** `200 OK`
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "SD Card sync task spawned cleanly."
    }
    ```

### `POST /api/maintenance/close`
*   **Description:** Signals native runtime UI display containers to handle app visibility exit triggers or secondary interface execution routines.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:** `200 OK`
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Teardown signal passed."
    }
    ```

### `GET /api/maintenance/status`
*   **Description:** Queries update manager states to retrieve active operation tags.
*   **Query Parameters:** None.
*   **Response Status:** `200 OK`
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "Idle"
    }
    ```


### `GET /api/maintenance/show`
*   **Description:** Reflectively references the background layout initialization variables on the main activity layer from an active server thread session to bypass private accessibility modifiers, forcing an immediate injection load of the configuration index bundle and shifting the viewport visibility token flags to display the Maintenance overlay layout.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Visibility tracking metrics updated successfully)
    *   `500 Internal Server Error` (If native layout context references are unavailable)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Maintenance view visibility flag altered to VISIBLE."
    }
    ```

### `GET /api/maintenance/hide`
*   **Description:** Instructs the native device UI thread loop layer to reflectively clear out focus states, dismantle the display rendering structure of the configuration overlay tool, and seamlessly transfer primary operational device focus boundaries back to the verified background workspace view.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (View destruction and canvas cleanup operations completed cleanly)
    *   `500 Internal Server Error` (If context framework verification lookups crash)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Maintenance view visibility flag altered to GONE."
    }
    ```

---

## 4. Cross-Origin Network Proxy Broker (`NetController`)

### `POST /api/net/request`
*   **Description:** Bypasses browser CORS constraints by forwarding a custom HTTP/HTTPS connection stream to a target server via the native Android Java layer network architecture. Returns remote response structures and headers.
*   **Query Parameters:** None (Configuration arguments are now processed directly within the root JSON request envelope).
*   **Request Body:** `application/json` object detailing orchestration constraints and downstream connection requirements:
    ```json
    {
      "timeout_ms": 15000,
      "request": {
        "url": "https://external.com",
        "method": "POST",
        "headers": { 
          "Accept": "application/json",
          "Content-Type": "text/plain"
        },
        "body": "{\"param\": 123}"
      }
    }
    ```
    *   `timeout_ms` *(Optional Integer)*: Root-level parameter controlling connection and data read timeout constraints for the proxy broker itself in milliseconds. Defaults to `15000` (15 seconds) if omitted.
    *   `request` *(Required Object)*: Encapsulates all isolated delivery parameters intended strictly for transmission to the remote destination.
*   **Response Status:** `200 OK` (Standard operational proxy link container response wrapper status)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:** Container detailing the isolated proxy result outcome profile:
    ```json
    {
      "status": 200,
      "headers": { 
        "Server": "nginx", 
        "Content-Type": "application/json" 
      },
      "body": "{\n  \"received\": true\n}"
    }
    ```


### `GET /api/net/download`
*   **Description:** Streams files directly from remote web services onto a localized path location context path.
*   **Query Parameters:**
    *   `url` (Required) - Absolute target remote file link download location source.
    *   `path` (Required) - Destination local sandbox filename target path.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Download stream initialized correctly)
    *   `400 Bad Request` (Missing required url or path params)
*   **Response Headers:** `Content-Type: application/json` (or dynamic error string values)
*   **Response Body:** Stream buffers (or JSON string errors if validation parameters check breaks).

### `GET /api/network/diagnostics`
*   **Description:** Generates an engineering snapshot recording the application's underlying socket environment properties and connection health metrics.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `500 Internal Server Error` (If native interface tracking loops or DNS trace steps crash)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "interfaces": {
        "active_transport": "WIFI",
        "link_downstream_kbps": 60000,
        "link_upstream_kbps": 12000,
        "is_network_metered": false
      },
      "system_proxy": {
        "is_proxy_active": false,
        "detected_host": "none",
        "detected_port": "none"
      },
      "dns_perf": {
        "diagnostic_target_host": "google.com",
        "resolution_successful": true,
        "resolved_ip_address": "142.251.47.46",
        "resolution_latency_ms": 3
      }
    }
    ```


## 5. Native Filesystem Archival Utilities (`ArcController`)

File system operations start at the root of either internal Application static storage, sandbox, or device storage at `/storage/emulated/0` as returned by `Environment.getExternalStorageDirectory()`

### `POST /api/arc/zip`
*   **Description:** Compresses a specified file or local directory tree structure into a standardized `.zip` archive payload block on the native storage filesystem.
*   **Query Parameters:** None.
*   **Request Body:** `application/json` object detailing compression requirements:
    ```json
    {
      "sourcePath": "arc_test_source_dir",
      "targetZipPath": "arc_test_payload.zip"
    }
    ```
*   **Response Status:** `200 OK` (Standard operational compression payload container wrapper status)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:** Container detailing the archival compression operational metrics outcome profile:
    ```json
    {
      "status": "success",
      "message": "Files compressed successfully into ZIP archive.",
      "archiveSize": 335
    }
    ```

### `POST /api/arc/unzip`
*   **Description:** Extracts the contents of a designated local `.zip` file archive binary layout block into a specified target directory destination layout hierarchy. Supports stripping leading path components from archive entries prior to extraction.
*   **Query Parameters:** None.
*   **Request Body:** `application/json` object detailing extraction requirements:
    ```json
    {
      "zipPath": "arc_test_payload.zip",
      "targetDirectory": "arc_test_extracted_out",
      "stripComponents": 1
    }
    ```
    *   `zipPath` (String, Required): The relative path to the source `.zip` archive file.
    *   `targetDirectory` (String, Required): The relative destination directory for extraction.
    *   `stripComponents` (Integer, Optional): Number of leading path elements to strip from internal entry paths (equivalent to `tar --strip-components=N`). Defaults to `0`.
*   **Response Status:** `200 OK` (Standard operational decompression payload container wrapper status)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:** Container detailing the extraction fulfillment state completion metadata profile:
    ```json
    {
      "status": "success",
      "message": "Archive successfully extracted onto native filesystem.",
      "targetDirectory": "arc_test_extracted_out",
      "componentsStripped": 1
    }
    ```

### `POST /api/arc/list`
*   **Description:** Inspects and catalogs the layout index inside a local `.zip` file without extracting it. Supports path-prefix directory filtering and paginated output boundaries to protect system memory resources against large archives.
*   **Query Parameters:** None.
*   **Request Body:** `application/json` object detailing lookup boundaries:
    ```json
    {
      "zipPath": "arc_list_payload.zip",
      "directoryPrefix": "documents",
      "offset": 1,
      "limit": 2
    }
    ```
    *   `zipPath` (String, Required): Relative path to the target archive file.
    *   `directoryPrefix` (String, Optional): Filter scope to list only items under a specific subdirectory branch name. Defaults to `""` (unfiltered).
    *   `offset` (Integer, Optional): Zero-indexed layout row to begin returning results. Defaults to `0`.
    *   `limit` (Integer, Optional): Maximum number of entry structures to slice into the response array container. Defaults to `100`.
*   **Response Status:** `200 OK` (Standard operational listing link container status)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:** Container detailing the structural zip data index inventory:
    ```json
    {
      "status": "success",
      "zipPath": "arc_list_payload.zip",
      "directoryPrefix": "documents/",
      "offset": 1,
      "limit": 2,
      "count": 2,
      "totalMatching": 3,
      "entries": [
        {
          "name": "documents/report2.txt",
          "isDirectory": false,
          "size": 20,
          "compressedSize": 20,
          "crc": 12847192
        },
        {
          "name": "documents/report3.txt",
          "isDirectory": false,
          "size": 20,
          "compressedSize": 20,
          "crc": 84910274
        }
      ]
    }
    ```

## 5. Device Runtime Hardware & Environment Inspection (`DeviceController`)

Low-level diagnostic utilities pull metrics directly from native system properties, internal hardware configurations, memory tracking subsystems, and localized runtime parameters. This endpoint provides deep monitoring capabilities for isolating hardware-specific defects.

### `GET /api/device/info`
*   **Description:** Aggregates a comprehensive multi-layered hardware snapshot, resource metric matrix, locale rule profiles, and active WebView core package specifications.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `500 Internal Server Error` (If device inspection runtime or hardware metric population crashes)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "hardware": {
        "brand": "samsung",
        "device": "a24",
        "model": "SM-A245F",
        "product": "a24nsxx",
        "manufacturer": "samsung",
        "hardware": "mt6789",
        "board": "a24",
        "bootloader": "A245FXXS9DYG1",
        "display_build_id": "AP3A.240905.015.A2.A245FXXS9DYG1"
      },
      "os": {
        "release_version": "15",
        "sdk_int": 35,
        "codename": "REL",
        "incremental": "A245FXXS9DYG1",
        "base_os": "samsung/a24nsxx/a24:15/AP3A.240905.015.A2/A245FXXU8DYE5:user/release-keys",
        "security_patch": "2025-08-01"
      },
      "build": {
        "fingerprint": "samsung/a24nsxx/a24:15/AP3A.240905.015.A2/A245FXXS9DYG1:user/release-keys",
        "id": "AP3A.240905.015.A2",
        "type": "user",
        "user": "dpi",
        "host": "SWDM8602",
        "tags": "release-keys",
        "time_epoch_ms": 1753784241000
      },
      "cpu": {
        "supported_abis": ["arm64-v8a", "armeabi-v7a", "armeabi"]
      },
      "memory": {
        "avail_ram_bytes": 837518336,
        "total_ram_bytes": 3833217024,
        "low_memory_flag": false,
        "threshold_bytes": 225443840,
        "status": "success"
      },
      "display": {
        "width_pixels": 1080,
        "height_pixels": 2340,
        "density_dpi": 450,
        "density_scale": 2.8125,
        "scaled_density_font": 2.8125,
        "xdpi": 391.885009765625,
        "ydpi": 398.89898681640625,
        "hardware_acceleration_enabled": true,
        "status": "MainActivity binding verified"
      },
      "storage": {
        "available_storage_bytes": 38750437376,
        "total_storage_bytes": 113429315584,
        "status": "success"
      },
      "webview_engine": {
        "package_name": "com.google.android.webview",
        "version_name": "149.0.7827.164"
      },
      "battery": {
        "percentage": 34.0,
        "temperature_celsius": 21.1,
        "is_charging": true,
        "plugged_source": "USB"
      },
      "locale": {
        "language_tag": "en-GB",
        "display_name": "English (United Kingdom)",
        "country_iso": "GB"
      }
    }
    ```

## 6. Program Runtime Profile & Diagnostics (`ProgramController`)

Application container diagnostic resources pull telemetry regarding active process execution attributes, JVM virtual machine heap resource metrics, concurrent worker thread tracking, instance uptime counters, and manifest package configurations.

### `GET /api/program/info`
*   **Description:** Generates a real-time tracking matrix measuring the true execution lifespan, operational headroom, and configuration settings of the program container layer.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `500 Internal Server Error` (If process interrogation mechanics drop or crash)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "process": {
        "pid": 4975,
        "uid": 10560,
        "is_64bit": true
      },
      "jvm_memory": {
        "free_heap_bytes": 58883472,
        "total_heap_bytes": 67108864,
        "max_heap_bytes": 268435456
      },
      "threading": {
        "active_thread_count": 33
      },
      "timeline": {
        "device_boot_uptime_ms": 1762785220,
        "app_uptime_ms": 4224
      },
      "package": {
        "package_name": "com.example.app",
        "version_name": "1.0",
        "target_sdk": 31,
        "version_code": 1,
        "first_install_time": 1782779634495,
        "status": "success"
      }
    }
    ```

## 7. SQLite Database File Inspection & Manipulation (`DatabaseController`)

Direct path-driven persistence layer inspection resources provide low-level management of SQLite database files on the local filesystem. This interface enforces safe transaction execution rules, type-safe column conversions, protection against accidental typo mutations, and performance-optimised prepared statements via parameterised arguments.

### Query Parameterization Flexibility
The interface completely supports both pure raw SQL strings and parameterized prepared queries. The `args` parameter array is optional. If `args` is omitted or left empty, the underlying backend engine falls back seamlessly to evaluate the `sql` string layout directly as an explicit raw script. 

*   **Pure Raw Style (No Arguments):** Best used for static setup queries or analytical operations that require no variable substitution (e.g., `CREATE TABLE...` or standard table selection scans).
*   **Prepared Style (With Placeholder Array):** Highly recommended when inserting or filtering dynamic string or numerical variables derived from runtime input data points to ensure maximum execution speed and prevent layout evaluation faults.

Example:

```json
{
  "path": "/data/user/0/com.example.app/databases/prepared_test.db",
  "sql": "SELECT * FROM device_faults WHERE id = 104;"
}
```


### `POST /api/database/create`
*   **Description:** Explicitly initializes a completely new, blank SQLite database container file at the exact requested location. If parent directory structures are missing, they are created automatically.
*   **Query Parameters:** None.
*   **Request Body:**
    ```json
    {
      "path": "/data/user/0/com.example.app/databases/prepared_test.db"
    }
    ```
*   **Response Status:**
    *   `201 Created` (Success; new file initialized on disk)
    *   `200 OK` (Success; target file already exists, skipping generation)
    *   `400 Bad Request` (If path parameter string is blank or missing)
    *   `500 Internal Server Error` (If file creation or transaction engine crashes)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "New empty SQLite database container initialized successfully",
      "created": true
    }
    ```

### `POST /api/database/query`
*   **Description:** Compiles and executes an analytical selection dataset read statement using optional data-bound parameter arguments. Maps SQLite native data type profiles seamlessly into structural JSON collections. Opens file streams in strict read-only isolation parameters.
*   **Query Parameters:** None.
*   **Request Body:**
    ```json
    {
      "path": "/data/user/0/com.example.app/databases/prepared_test.db",
      "sql": "SELECT id, error_tag, severity FROM device_faults WHERE error_tag = ? AND severity > ?;",
      "args": ["webview_crash_null_pointer", 50.0]
    }
    ```
*   **Response Status:**
    *   `200 OK` (Success)
    *   `400 Bad Request` (If path or query string parameters are missing)
    *   `404 Not Found` (If database target file does not exist on disk)
    *   `500 Internal Server Error` (If SQL query parsing or structure interpretation fails)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "rows": [
        {
          "id": 104,
          "error_tag": "webview_crash_null_pointer",
          "severity": 89.65
        }
      ],
      "row_count": 1
    }
    ```

### `POST /api/database/execute`
*   **Description:** Validates and executes mutating row statements (`INSERT`, `UPDATE`, `DELETE`) or physical schema definitions inside an existing target. Employs pre-compiled `SQLiteStatement` instances when parameter arrays are supplied for high-performance throughput. Blocks structural drop or vacuum actions to ensure safety.
*   **Query Parameters:** None.
*   **Request Body:**
    ```json
    {
      "path": "/data/user/0/com.example.app/databases/prepared_test.db",
      "sql": "INSERT INTO device_faults (id, error_tag, severity) VALUES (?, ?, ?);",
      "args": [104, "webview_crash_null_pointer", 89.65]
    }
    ```
*   **Response Status:**
    *   `200 OK` (Success)
    *   `400 Bad Request` (If mandatory payload parameters are absent)
    *   `403 Forbidden` (If structural queries like `DROP` or `ALTER` are intercepted)
    *   `404 Not Found` (If path is missing from storage, protecting against typo creation loops)
    *   `500 Internal Server Error` (If engine execution crashes)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Parameterized statement compiled and executed successfully"
    }
    ```

### `POST /api/database/delete`
*   **Description:** Purges a targeted database completely from storage. Safely tracks and deletes hidden peripheral transaction logs (`-wal`, `-journal`, `-shm`) created by the OS engine runtime layer.
*   **Query Parameters:** None.
*   **Request Body:**
    ```json
    {
      "path": "/data/user/0/com.example.app/databases/prepared_test.db"
    }
    ```
*   **Response Status:**
    *   `200 OK` (Success)
    *   `400 Bad Request` (If path layout parameter missing)
    *   `404 Not Found` (If target file does not exist on the file structure)
    *   `500 Internal Server Error` (If target file cannot be cleared or is locked by active thread connections)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "Database and peripheral structural journals purged completely"
    }
    ```

## 8. Android Core Security Runtime Permissions (`PermissionsController`)

Provides lightweight, deadlock-free structural tracking and programmatic user dialog dispatching capabilities over the application container permission lifecycle context. 

To eliminate low-level JVM-to-WebView threading deadlocks on modern Android versions, the request API operates strictly asynchronously, allowing the client testing framework to implement non-blocking polling loops during synchronous evaluation scenarios.

### `POST /api/permissions/status`
*   **Description:** Batch-evaluates the active system clearance metrics for an incoming list of Android manifest permission strings.
*   **Query Parameters:** None.
*   **Request Body:**
    ```json
    {
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO"
      ]
    }
    ```
*   **Response Status:** `200 OK` (Success)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "permissions_matrix": {
        "android.permission.CAMERA": "GRANTED",
        "android.permission.RECORD_AUDIO": "DENIED"
      }
    }
    ```

### `POST /api/permissions/request`
*   **Description:** Asynchronously dispatches an invitation request to cross over onto the native Android UI thread loop and inflate the platform user authorization prompt dialog box modal over the active viewport layout.
*   **Query Parameters:** None.
*   **Request Body:**
    ```json
    {
      "permissions": [
        "android.permission.CAMERA"
      ]
    }
    ```
*   **Response Status:** `202 Accepted` (Request acknowledged and safely queued for native user interaction)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "message": "System dialog sequence triggered successfully"
    }
    ```

### `GET /api/permissions/declared`
*   **Description:** Queries Android's localized `PackageManager` system layer at runtime to unpack the compiled package configuration block. It dynamically extracts every permission explicitly declared in the application's structural `AndroidManifest.xml` file, providing a verified baseline of operations the app is authorized to request from a user.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (On successful package info inspection)
    *   `500 Internal Server Error` (If context elements are missing or security checks block inspection)
*   **Response Headers:** `Content-Type: application/json`, `X-Server-Response-Engine: Android-Native-JVM`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "package_name": "com.example.app",
      "declared_permissions": [
        "android.permission.ACTIVITY_RECOGNITION",
        "android.permission.HIGH_SAMPLING_RATE_SENSORS",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.MANAGE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED"
      ],
      "total_count": 15
    }
    ```


## 9. WebView Core Engine Profile & Settings Analysis (`WebViewController`)

Provides a comprehensive diagnostic mapping of the underlying Chromium engine parameters, session cookie parameters, application-level manifest cleartext transmission permissions, and absolute filesystem directory cache sizes inside the application workspace.

### `GET /api/webview/diagnostics`
*   **Description:** Aggregates a multi-layered engineering telemetry snapshot detailing the active rendering rules, sandbox persistence directories, and configuration settings of the engine layer.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (Success)
    *   `500 Internal Server Error` (If context processing or recursive cache size scanning crashes)
*   **Response Headers:** `Content-Type: application/json`
*   **Response Body:**
    ```json
    {
      "security_policy": {
        "uses_cleartext_traffic_allowed": true,
        "target_sdk_compliance": 31
      },
      "cookie_engine": {
        "accept_cookies_enabled": true,
        "has_cookies_stored": false
      },
      "configurations": {
        "javascript_enabled": true,
        "dom_storage_enabled": true,
        "database_enabled": true,
        "file_access_enabled": true,
        "loads_images_automatically": true,
        "mixed_content_mode": 2,
        "active_cache_mode": "LOAD_DEFAULT",
        "status": "Thread-safe default values mapping applied"
      },
      "storage_allocation": {
        "webview_cache_directory_path": "/data/user/0/com.example.app/app_webview",
        "webview_cache_allocated_bytes": 2055208,
        "status": "success"
      }
    }
    ```

### 10. `WS /api/ws/telemetry/sensors`
*   **Description:** Opens a persistent, bidirectional WebSocket session loop over the custom virtual proxy matrix. Upon a successful handshake, it immediately triggers the native Android `SensorManager` to bind an active hardware event listener on a background thread and stream raw physical coordinates down to the client view layout.
*   **Connection Initialization (OnOpen Event Frame):** Sent automatically by the native JVM layer the millisecond the connection transitions to an open state.
    ```json
    {
      "status": "connected",
      "message": "Welcome from Native Android JVM Lifecycle Handler",
      "assigned_id": "xkg26mzwb1783376902075"
    }
    ```
*   **Inbound Streaming Frame Payload:** Emitted continuously at high frequency directly from the device's physical acceleration hardware or time-series background fallback engine threads.
    ```json
    {
      "status": "telemetry_update",
      "sensor_type": "accelerometer",
      "data": {
        "x": 1.7836803197860718,
        "y": -0.5147533416748047,
        "z": 9.78989028930664,
        "timestamp": 1783376902558
      }
    }
    ```
*   **Connection Closure (OnClose Lifecycle Action):** Triggered immediately when the browser tab closes, navigates away, or explicitly executes a close sequence command. The framework automatically cuts background runtime workers and releases system hooks to eliminate battery and memory resource leaks.

## Application String Resource Services (`ResController`)

### `GET /api/res/string`
*   **Description:** Queries the application's compiled internal XML resource registry directly at runtime. It takes an identifier key name string, dynamically looks up its matching internal signature mapping, and extracts its evaluated definition payload directly from the project's compiled `strings.xml` bundle.
*   **Query Parameters:**
    *   `key` (String, Required): The exact string item key name to look up (e.g. `app_name`).
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (On successful key resource lookup resolution)
    *   `400 Bad Request` (If the mandatory query `key` parameter configuration is missing)
    *   `404 Not Found` (If the requested key does not exist inside strings.xml)
    *   `500 Internal Server Error` (If context elements are invalid or resource tracking arrays crash)
*   **Response Headers:** `Content-Type: application/json`, `X-Server-Response-Engine: Android-Native-JVM`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "key": "app_name",
      "value": "My Embedded Sandbox Application"
    }
    ```

### `GET /api/res/strings`
*   **Description:** Reflectively targets and inspects the inner class container `R.string` bound to the application's compiled resources footprint. It dynamically loops across all static resource field entries to resolve their underlying content mappings, yielding an aggregated complete key-value dictionary matrix of all string assets present inside `strings.xml`.
*   **Query Parameters:** None.
*   **Request Body:** None.
*   **Response Status:**
    *   `200 OK` (On successful bulk database trace compilation)
    *   `500 Internal Server Error` (If context fields match invalid signatures or R$string mappings are obfuscated)
*   **Response Headers:** `Content-Type: application/json`, `X-Server-Response-Engine: Android-Native-JVM`
*   **Response Body:**
    ```json
    {
      "status": "success",
      "package_name": "com.example.app",
      "total_strings_count": 2,
      "strings_matrix": {
        "app_name": "Hybrid-Mobile App",
        "alternative_setup_title": "Alternative Setup Profile Configuration"
      }
    }
    ```

