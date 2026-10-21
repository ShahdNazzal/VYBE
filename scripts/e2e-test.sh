#!/bin/bash
# End-to-end API test for VYBE (uses a scratch account).
set -e
BASE="http://localhost:3000"
JAR="/tmp/vybe-test-cookies.txt"
EMAIL="e2e-$(date +%s)@vybe-test.app"
PASS="testpass123"

echo "== 1. Register =="
curl -s -c "$JAR" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"E2E Tester\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | head -c 300; echo

echo "== 2. Me =="
curl -s -b "$JAR" "$BASE/api/auth/me" | head -c 200; echo

echo "== 3. Create items =="
IMG="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a0add97b40f4.jpg"
IMG2="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/bb8903e24bf3.jpg"
create_item() {
  curl -s -b "$JAR" -X POST "$BASE/api/items" -H 'Content-Type: application/json' -d "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('item',{}).get('id') or d)" 2>/dev/null || echo "ERR"
}
ID_TOP=$(create_item "{\"name\":\"White Cotton Tee\",\"category\":\"tops\",\"colorway\":\"White\",\"styleTag\":\"Minimalist\",\"season\":\"all-season\",\"imageUrl\":\"$IMG\"}")
ID_TOP2=$(create_item "{\"name\":\"Black Silk Blouse\",\"category\":\"tops\",\"colorway\":\"Black\",\"styleTag\":\"Classic\",\"season\":\"all-season\",\"imageUrl\":\"$IMG2\"}")
ID_BOT=$(create_item "{\"name\":\"Straight Denim\",\"category\":\"bottoms\",\"colorway\":\"Indigo\",\"styleTag\":\"Streetwear\",\"season\":\"all-season\",\"imageUrl\":\"$IMG\"}")
ID_BOT2=$(create_item "{\"name\":\"Navy Chinos\",\"category\":\"bottoms\",\"colorway\":\"Navy\",\"styleTag\":\"Preppy\",\"season\":\"all-season\",\"imageUrl\":\"$IMG2\"}")
ID_SHOE=$(create_item "{\"name\":\"White Sneakers\",\"category\":\"shoes\",\"colorway\":\"White\",\"styleTag\":\"Sporty\",\"season\":\"all-season\",\"imageUrl\":\"$IMG\"}")
ID_OUTER=$(create_item "{\"name\":\"Wool Blazer\",\"category\":\"outerwear\",\"colorway\":\"Black\",\"styleTag\":\"Classic\",\"season\":\"fall\",\"imageUrl\":\"$IMG2\"}")
echo "ids: $ID_TOP $ID_TOP2 $ID_BOT $ID_BOT2 $ID_SHOE $ID_OUTER"

echo "== 4. List items with filter =="
curl -s -b "$JAR" "$BASE/api/items?category=tops" | python3 -c "import sys,json; d=json.load(sys.stdin); print('tops count:', len(d['items']))"

echo "== 5. Generate outfits (AI) =="
GEN=$(curl -s -b "$JAR" -X POST "$BASE/api/outfits/generate" -H 'Content-Type: application/json' \
  -d "{\"occasion\":\"Office Day\",\"style\":\"Minimalist\",\"excludeCategories\":[],\"excludeItemIds\":[],\"mustIncludeItemId\":null}")
echo "$GEN" | head -c 400; echo
GEN_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('generationId',''))" 2>/dev/null)
echo "generationId=$GEN_ID"

echo "== 6. Fetch generation results =="
RES=$(curl -s -b "$JAR" "$BASE/api/outfits?generation=$GEN_ID")
echo "$RES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
outfits = d['outfits']
print('outfits:', len(outfits))
for o in outfits:
    print(' -', o['name'], '| source:', o['source'], '| saved:', o['saved'], '| items:', o['itemIds'][:80])
    print('   explanation:', o['explanation'][:100])
"
FIRST_OUTFIT_ID=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['outfits'][0]['id'])")
FIRST_ITEM_ID=$(echo "$RES" | python3 -c "
import sys,json
o = json.load(sys.stdin)['outfits'][0]
ids = json.loads(o['itemIds'])
print(ids[0])
")

echo "== 7. Replace item $FIRST_ITEM_ID in outfit $FIRST_OUTFIT_ID =="
curl -s -b "$JAR" -X POST "$BASE/api/outfits/replace" -H 'Content-Type: application/json' \
  -d "{\"outfitId\":\"$FIRST_OUTFIT_ID\",\"replaceItemId\":\"$FIRST_ITEM_ID\"}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('REPLACE ERROR:', d['error'])
else:
    s = d['swap']
    print('swap:', s['removedItemId'][:10], '->', s['addedItemId'][:10], '| source:', s['source'])
    print('reason:', s['reason'][:120])
    new_ids = json.loads(d['outfit']['itemIds'])
    old_ids = s['removedItemId']
    others_kept = set(new_ids) | {old_ids}
    print('new itemIds:', [i[:10] for i in new_ids])
"

echo "== 8. Save outfit =="
curl -s -b "$JAR" -X PATCH "$BASE/api/outfits/$FIRST_OUTFIT_ID" -H 'Content-Type: application/json' \
  -d '{"saved":true}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('saved:', d['outfit']['saved'])"

echo "== 9. Saved list =="
curl -s -b "$JAR" "$BASE/api/outfits?saved=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print('saved outfits:', len(d['outfits']))"

echo "== 10. Delete item + verify ownership guard =="
ITEM_TO_DEL=$ID_TOP2
curl -s -b "$JAR" -X DELETE "$BASE/api/items/$ITEM_TO_DEL" | head -c 100; echo
echo "-- unauth check (no cookie) --"
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/items"; echo

echo "== 11. Logout =="
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/logout" | head -c 100; echo
echo "E2E_DONE"
