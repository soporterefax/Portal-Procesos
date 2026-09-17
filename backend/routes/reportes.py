from flask import Blueprint, jsonify
from sqlalchemy import func
from extensions import db
from models import Area, Documento, Proceso
from auth_utils import login_requerido
reportes_bp=Blueprint('reportes',__name__,url_prefix='/api/reportes')
@reportes_bp.get('')
@login_requerido
def reportes():
    pa=db.session.query(Area.nombre,func.count(Proceso.id)).outerjoin(Proceso,Proceso.area_id==Area.id).group_by(Area.id,Area.nombre).order_by(func.count(Proceso.id).desc()).all()
    dt=db.session.query(Documento.tipo,func.count(Documento.id)).group_by(Documento.tipo).order_by(func.count(Documento.id).desc()).all()
    tipos=db.session.query(Proceso.tipo,func.count(Proceso.id)).group_by(Proceso.tipo).order_by(func.count(Proceso.id).desc()).all()
    return jsonify({'totales':{'areas':Area.query.count(),'procesos':Proceso.query.count(),'criticos':Proceso.query.filter_by(es_critico=True).count(),'documentos':Documento.query.count()},'procesos_por_area':[{'nombre':x[0],'cantidad':x[1]} for x in pa],'documentos_por_tipo':[{'nombre':x[0] or 'Sin tipo','cantidad':x[1]} for x in dt],'procesos_por_tipo':[{'nombre':x[0] or 'Sin tipo','cantidad':x[1]} for x in tipos]})
