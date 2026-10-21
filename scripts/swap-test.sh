#!/bin/bash
# Focused swap-success test: 2 tops, 2 bottoms, 2 shoes → swap should work.
set -e
BASE="http://localhost:3000"
JAR="/tmp/vybe-swap-test.txt"
EMAIL="swap-$(date +%s)@vybe-test.app"
IMG="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a0add97b40f4.jpg"
IMG2="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/bb8903e24bf3.jpg"

curl -s -c "$JAR" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Swap Tester\",\"email\":\"$EMAIL\",\"password\":\"testpass123\"}" > /dev/null

for item in \
  '{"name":"White Tee","category":"tops","imageUrl":"'$IMG'","styleTag":"Minimalist"}' \
  '{"name":"Black Blouse","category":"tops","imageUrl":"'$IMG2'","styleTag":"Classic"}' \
  '{"name":"Denim","category":"bottoms","imageUrl":"'$IMG'","styleTag":"Streetwear"}' \
  '{"name":"Chinos","category":"bottoms","imageUrl":"$IMG2","styleTag":"Preppy"}' \
  '{"name":"Sneakers","category":"shoes","imageUrl":"'$IMG'","styleTag":"Sporty"}' \
  '{"name":"Loafers","category":"shoes","imageUrl":"'$IMG2'","styleTag":"Classic"}'; do
  curl -s -b "$JAR" -X POST "$BASE/api/items" -H 'Content-Type: application/json' -d "$item" > /dev/null
done

GEN=$(curl -s -b "$JAR" -X POST "$BASE/api/outfits/generate" -H 'Content-Type: application/json' \
  -d '{"occasion":"Weekend Brunch","style":"Minimalist"}')
GEN_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['generationId'])")
echo "generation: $GEN_ID"

RES=$(curl -s -b "$JAR" "$BASE/api/outfits?generation=$GEN_ID")
echo "$RES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for o in d['outfits']:
    print(' -', o['name'], '| items:', [i['name'] for i in json.loads(o['itemsJson'])])
"
FIRST_ID=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['outfits'][0]['id'])")
TARGET=$(echo "$RES" | python3 -c "
import sys, json
o = json.load(sys.stdin)['outfits'][0]
items = json.loads(o['itemsJson'])
tops = [i for i in items if i['category'] == 'tops']
print(tops[0]['id'] if tops else items[0]['id'])
")
echo "swapping item: $TARGET in outfit: $FIRST_ID"

curl -s -b "$JAR" -X POST "$BASE/api/outfits/replace" -H 'Content-Type: application/json' \
  -d "{\"outfitId\":\"$FIRST_ID\",\"replaceItemId\":\"$TARGET\"}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('SWAP ERROR:', d['error'])
else:
    s = d['swap']
    items = [i['name'] for i in json.loads(d['outfit']['itemsJson'])]
    print('SWAP OK:', s['removedItemId'][:8], '->', s['addedItemId'][:8], '| source:', s['source'])
    print('reason:', s['reason'])
    print('new look:', items)
"
echo "SWAP_TEST_DONE"
