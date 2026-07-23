#!/bin/bash

# Ensure terminal printing has clean separation line visibility
echo "================================================================="
echo "📊 EXERCISING ADVANCED PRODUCTS ODATA V4 PIPELINE"
echo "================================================================="

# -----------------------------------------------------------------
# 1. READ TEST (Bob - Authenticated User)
# -----------------------------------------------------------------
echo -e "\n1. Reading active products using 'bob' (Should succeed)..."
curl -s -u "bob:123" "http://localhost:4004/odata/v4/test/Products" | jq '.'

# -----------------------------------------------------------------
# 2. RBAC MUTATION RESTRICTION TEST (Bob - Authenticated User)
# -----------------------------------------------------------------
echo -e "\n2. Attempting to create a product using 'bob' (Should fail with 403 Forbidden)..."
curl -s -u "bob:123" -X POST "http://localhost:4004/odata/v4/test/Products" \
     -H "Content-Type: application/json" \
     -d '{
       "SKU": "SKU-FAIL-999",
       "Name": "Unauthorized Attractor Beam",
       "Category": "Weapons",
       "Price": 999.99,
       "StockCount": 1,
       "IsDiscontinued": false
     }' | jq '.'

# -----------------------------------------------------------------
# 3. FANCY DEEP-INSERT MUTATION TEST (Alice - Administrative Access)
# -----------------------------------------------------------------
# Generate unique randomized SKU numbers to avoid unique constraint drift on subsequent manual executions
RAND_ID=$RANDOM
NEW_SKU="SKU-GEN-${RAND_ID}"
NEW_ORDER="ORD-2026-${RAND_ID}"

echo -e "\n3. Executing fancy Deep-Insert (Product + child Order Items) using 'alice'..."
curl -s -u "alice:123" -X POST "http://localhost:4004/odata/v4/test/Products" \
     -H "Content-Type: application/json" \
     -d '{
       "SKU": "'"${NEW_SKU}"'",
       "Name": "Autonomous Forklift Model X-'${RAND_ID}'",
       "Category": "Logistics",
       "Price": 45000.00,
       "StockCount": 5,
       "IsDiscontinued": false,
       "orderItems": [
         {
           "OrderNumber": "'"${NEW_ORDER}"'",
           "Quantity": 3,
           "DeliveryDate": "2026-10-12"
         }
       ]
     }' | jq '.'

# -----------------------------------------------------------------
# 4. FANCY QUERY SELECTION & EXPANSION VERIFICATION (Bob - Authenticated User)
# -----------------------------------------------------------------
echo -e "\n4. Verifying persistence with advanced query parameters ($filter + $expand) using 'bob'..."
# This targets the product line we just generated, filtering by SKU and expanding its child orders.
# Note: URL characters are handled directly via curl parameter strings safely.
curl -s -u "bob:123" "http://localhost:4004/odata/v4/test/Products?\$filter=SKU%20eq%20'${NEW_SKU}'&\$expand=orderItems" | jq '.'

echo -e "\n================================================================="
echo "✅ Finished manual curl illustration script."
echo "================================================================="

