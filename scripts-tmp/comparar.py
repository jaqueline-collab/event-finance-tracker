import json,sys
a=json.load(open(sys.argv[1]));b=json.load(open(sys.argv[2]))
dif=[]
def w(x,y,p):
    if isinstance(x,dict) and isinstance(y,dict):
        for k in set(x)|set(y):
            if k in("ultimaSync",): continue
            w(x.get(k),y.get(k),p+"/"+k)
    elif isinstance(x,list) and isinstance(y,list) and len(x)==len(y):
        for i,(u,v) in enumerate(zip(x,y)): w(u,v,p+f"[{i}]")
    elif x!=y: dif.append((p,str(x)[:80],str(y)[:80]))
w(a,b,"")
print(len(dif),"diferenças");[print(d) for d in dif[:30]]
