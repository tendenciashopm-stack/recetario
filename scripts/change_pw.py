import os, bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
c=MongoClient(os.environ["MONGO_URL"])
db=c[os.environ["DB_NAME"]]
email="compratendencia0@gmail.com"; newpw="Elmo2893"
h=bcrypt.hashpw(newpw.encode(), bcrypt.gensalt()).decode()
res=db.users.update_one({"email":email},{"$set":{"password_hash":h,"role":"admin","active":True}})
print("matched:",res.matched_count,"modified:",res.modified_count)
