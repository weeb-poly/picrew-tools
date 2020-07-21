import json
from krita import *

toolspath = "C:/Users/timhc/Downloads/../Documents/GitHub/picrew-tools/"
imgId = "17250"

inst = Krita.instance()
doc = inst.activeDocument()
#cats = doc.topLevelNodes()
#for cat in cats:
#    for choice in cat.childNodes():
#        for color in choice.childNodes():
#            print(cat.name(), choice.name(), color.name(), color.path())

cf_data = {}
with open(f"{toolspath}/data/picrew.cf.data.{imgId}.json") as f:
    cf_data = json.load(f)

img_data = {}
with open(f"{toolspath}/data/picrew.img.data.{imgId}.json") as f:
    img_data = json.load(f)

root = doc.rootNode()
for cat in cf_data['pList']:
    name = cat['pNm']
    defItmId = cat['defItmId']

    cat_node = doc.createGroupLayer(name)
    cat_node.setLocked(True)
    root.addChildNode(cat_node, None)

    for item in cat['items']:
        itemId = item['itmId']
        
        item_node = doc.createGroupLayer(str(itemId))
        item_node.setVisible(itemId == defItmId)
        cat_node.addChildNode(item_node, None)
        
        parts = list(img_data['lst'][str(itemId)].values())[0]

        for name, part in parts.items():
            fname = part['url'].split('/')[-1]

            col_node = doc.createFileLayer(name, f"{toolspath}/imgs/{fname}", "None")
            item_node.addChildNode(col_node, None)
