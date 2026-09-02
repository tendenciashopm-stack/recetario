import os, requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
API="http://localhost:8001/api"
STORAGE_BASE=(os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL=STORAGE_BASE.rstrip("/")+"/objstore/api/v1/storage"
KEY=os.environ.get("EMERGENT_LLM_KEY")
APP="salud-nutrition"

# map recipe name -> ordered image urls (step1..5)
J="https://static.prod-images.emergentagent.com/jobs/6d151a38-c124-4715-a097-51646dc7f340/images/"
S={
 "Ensalada de Quinua Andina":[ "de6b23609d42e593aab145a61b2be55170a7ab1eaac19743875160ec2f1422d6","e881cf95a2c41e8a1b9467ab9bc87c5d0889a457f5258b4868f03fedb4f1ad4d","4436c5fb2d63c8d149da280362e8f9e4963373e111d7a52c2df3cae66db630ed","ebe2acf602f625e8588cc7460feeef1c0a1dd4a3ea84856c86eee051ac492e64","ddb7e0be96af46ad4defb1350423a489af6092ce6cc8977e38e418db6167f80f"],
 "Lentejas Guisadas Ligeras":["f8fdc45b259b1d3703a1d517906dab85a28c473a6ba34719ba477c8f9d0e5a17","da0341a7e61c9f2193c7e966d163d264c426ac7d986263ba5bd125b8a3617de5","89e03c297497cb71bbe94388629ca2e5351eb569537a97785e5f9bff251eafb9","909ddc3390cef2828a8e5e20937caa9e24649beb133648d9303eb4e4f3a6ccfa","5e892bf187c6d1e873223a88c83dfcf8561d06b870ebadc966f8a9e9fa89653e"],
 "Pechuga a la Plancha con Ensalada":["04ea152986220319883b1f998dc791e6fe730d06bac6054756a0b82e444fa5ea","d153c709822a750e8ee38d641e3c5eac2f89f84f47bc5f9052e237ea7a2787d1","2cd4e87cd335013ff486e7e53e8c22d2426fa3f1d6a66a193cdbf0e435c74c07","4d945577c58a35ece7f5c81909e27d701aa07ace949dfd1fbcf7f33ec3ed855d","0544095653d0aedc65d390bf1328dfd3245a6294d8f3b1c9f068bf5d40569640"],
 "Crema de Verduras Detox":["f2f88f0b66cd6e13510164ab5bc04e2e82aff02c5b751e3dd2e17a749cfa41b0","131faf50a0b777f3fdad5055702777160db2db70e5b9d79b21747ef12becff16","6fd5098a76566e1d48c5ea9adeaf522cb696fe50d4a2364531ed945feb85df32","fe766876390d382ebcba0b6e24f715a1928127fd0b75eee750104849f304da84","9d8144b88b205fd0785f9a44646e5fc7ecfd8f0c2484c5fcfdecfef2a737c7e3"],
 "Tortilla de Espinaca al Horno":["764c17eb0d5bfe49c20d772d214493371ba478e5579d9f354ead3ce2458a0b1e","edc5465c0803956475f6a48958362799c0bf560241546501e19b4b0feae410e9","97fc505ab24b67c7faaf9e279ef7d7627aa1d4a0e867f34f7bebb40abae65e8b","2af0ee7a41dc6243f5d619ebdb193a1f460899b3d08bf2fb5574498bfae81fe9","095e9bec4c380197ce8d29cdc895e87818ad72a94051155d464979727b3d574f"],
 "Pescado al Vapor con Vegetales":["06623fb0a301158dbd925f5b84a8fde1d90a6c99e8f1ab24a5997fa49fe69a11","8ce162627fac9f08128ef0e4f6cb3001f6339fbbbffab1e9b852e183cd47e8fe","127f9f1d2bdedc665de2cad0dcb2f94b201d04e867d971639b8f8ef2776f76b8","380bd9637f0480c9ec47dc5eab7a377a2e16835b1a5a7413d0791481ca983c88","93fed9eb3115a6e15217efc4439f4824661f10266b711fbb08821cf0e360a673"],
 "Bowl de Avena y Frutas":["44cfb729da92d26a1b2030f808bf0238d61405237b09f4bd173a0ebc8759e8ae","23fc4f8f2711159d41c3ed446b528f610b290c6c6a6b18472b150b0c54b1586f","a1e1b2dbf3bc0c22eb910fb811012fd72e6aaeca9b4a30e7504f5ddb0b22d08a","9d54367e18b16e94063aedad153eef196845482d2a0cab46e9b039593cbbe5bb","da92eeec62b9f319e0f6447fb76234fb8d8a41d6e466d11a43a913f91aeb3cdd"],
 "Salteado de Verduras y Tofu":["99216b767c16893df2bd15b3940e97c049b83514781be264ab8ca9e6b1a0d2e6","0a00a95c20fba3bc75d2e7e2a7796416b787fb53c8b7be5bd56b5b2a2d00514a","e68e3ab15fbb329f2f182d21a6d4e771c86b316762b90175df603184beaebd1c","c8c9d443ad35e89feb12b81e7523fac636881109e8e494501c0e83ea283e0cfb","bac48b3fb8eb0093be15945756af95bf71a479c69f7b6e97cf18d206d5f8b021"],
}
sk=requests.post(f"{STORAGE_URL}/init", json={"emergent_key":KEY}, timeout=30).json()["storage_key"]
tok=requests.post(f"{API}/auth/login", json={"email":"admin@saludnutrition.com","password":"Admin2026!"}).json()["token"]
H={"Authorization":f"Bearer {tok}"}
recipes=requests.get(f"{API}/admin/recipes",headers=H).json()
byname={r["nombre_plato"]:r for r in recipes}
for name,ids in S.items():
    r=byname.get(name)
    if not r: print("NOT FOUND",name); continue
    paths=[]
    for i,iid in enumerate(ids,1):
        data=requests.get(J+iid+".jpeg",timeout=60).content
        p=f"{APP}/gen-steps/{r['id']}-{i}.jpeg"
        rr=requests.put(f"{STORAGE_URL}/objects/{p}", headers={"X-Storage-Key":sk,"Content-Type":"image/jpeg"}, data=data, timeout=120)
        rr.raise_for_status(); paths.append(rr.json()["path"])
    body={k:r[k] for k in ["nombre_plato","categoria","descripcion","imagen_url","ingredientes","preparacion","emplatado","tiempo_preparacion","tiempo_coccion","dificultad","porciones","utensilios","nutricion","published"]}
    body["pasos_imagenes"]=paths
    pr=requests.put(f"{API}/admin/recipes/{r['id']}", headers=H, json=body, timeout=60)
    print(name, pr.status_code, len(paths))
print("DONE")
