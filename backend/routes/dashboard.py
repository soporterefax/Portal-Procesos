from flask import Blueprint, jsonify
from sqlalchemy import func
from extensions import db
from models import Area, Documento, Proceso
from auth_utils import login_requerido

dashboard_bp=Blueprint('dashboard',__name__,url_prefix='/api/dashboard')
@dashboard_bp.get('')
@login_requerido
def dashboard():
    ta=Area.query.count();tp=Proceso.query.count();tc=Proceso.query.filter_by(es_critico=True).count();td=Documento.query.count()
    pa=db.session.query(Area.nombre,func.count(Proceso.id)).outerjoin(Proceso,Proceso.area_id==Area.id).group_by(Area.id,Area.nombre).order_by(Area.nombre).all()
    recientes=Proceso.query.join(Area).order_by(Proceso.id.desc()).limit(8).all()
    criticos=Proceso.query.join(Area).filter(Proceso.es_critico.is_(True)).order_by(Proceso.id.desc()).limit(5).all()
    def mini(p):return {'id':p.id,'codigo':p.codigo,'nombre':p.nombre,'area':p.area.nombre,'tipo':p.tipo,'es_critico':p.es_critico}
    return jsonify({'kpis':{'areas':ta,'procesos':tp,'criticos':tc,'documentos':td,'porcentaje_criticos':round(tc/tp*100) if tp else 0},'procesos_por_area':[{'area':x[0],'cantidad':x[1]} for x in pa],'procesos_recientes':[mini(x) for x in recientes],'criticos_recientes':[mini(x) for x in criticos]})
