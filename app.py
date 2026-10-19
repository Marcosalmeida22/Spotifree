"""API privada: Python + Flask + MySQL + YouTube."""
import html
import hmac
import json
import os
import re
import secrets
from functools import wraps
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
import mysql.connector
from mysql.connector import pooling
from werkzeug.security import generate_password_hash, check_password_hash

ROOT=Path(__file__).resolve().parent
load_dotenv(ROOT/'.env')
app=Flask(__name__)
INTERNAL_TOKEN=os.environ.get('INTERNAL_TOKEN',secrets.token_hex(32))
app.config.update(SECRET_KEY=os.environ.get('SESSION_SECRET') or secrets.token_hex(32),SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Lax',SESSION_COOKIE_SECURE=os.getenv('COOKIE_SECURE')=='true',MAX_CONTENT_LENGTH=16384)
pool=None
CATALOG=[('EWrX250Zhko','lofi hip hop radio — beats to relax/study to','Lofi Girl','Focus'),('4NRXx6U8ABQ','Blinding Lights','The Weeknd','Pop'),('kJQP7kiw5Fk','Despacito','Luis Fonsi · Daddy Yankee','Latino'),('JGwWNGJdvx8','Shape of You','Ed Sheeran','Pop'),('fJ9rUzIMcZQ','Bohemian Rhapsody','Queen','Rock'),('hT_nvWreIhg','Counting Stars','OneRepublic','Pop'),('pRpeEdMmmQ0','Waka Waka (This Time for Africa)','Shakira','Latino'),('YqeW9_5kURI','Lean On','Major Lazer & DJ Snake','Electrónica')]

def query(sql,args=(),one=False):
    with pool.get_connection() as db:
        with db.cursor(dictionary=True) as c:
            c.execute(sql,args)
            return c.fetchone() if one else c.fetchall()

def write(sql,args=()):
    with pool.get_connection() as db:
        with db.cursor() as c:
            c.execute(sql,args)
            result=c.lastrowid
        db.commit()
        return result

def init_db():
    global pool
    pool=pooling.MySQLConnectionPool(pool_name='spotifree',pool_size=5,host=os.getenv('MYSQL_HOST','127.0.0.1'),port=int(os.getenv('MYSQL_PORT','3306')),user=os.getenv('MYSQL_USER','spotifree'),password=os.getenv('MYSQL_PASSWORD',''),database=os.getenv('MYSQL_DATABASE','spotifree'),charset='utf8mb4')
    with pool.get_connection() as db:
        with db.cursor() as c:
            for statement in (ROOT/'schema.sql').read_text(encoding='utf-8').split(';'):
                if statement.strip(): c.execute(statement)
            c.executemany('INSERT IGNORE INTO tracks(id,title,artist,genre) VALUES(%s,%s,%s,%s)',CATALOG)
            email,password=os.getenv('ADMIN_EMAIL','').strip().lower(),os.getenv('ADMIN_PASSWORD','')
            if email and len(password)>=10:
                c.execute("INSERT IGNORE INTO users(email,name,password_hash,role) VALUES(%s,%s,%s,'admin')",(email,'Administrador',generate_password_hash(password)))
                c.execute("UPDATE users SET role='admin' WHERE email=%s",(email,))
        db.commit()

@app.before_request
def guard():
    if not hmac.compare_digest(request.headers.get('X-Internal-Token',''),INTERNAL_TOKEN): return jsonify(error='Acceso directo no permitido.'),403
    if request.method=='POST':
        expected=session.get('csrf')
        if not expected or not hmac.compare_digest(request.headers.get('X-CSRF-Token',''),expected): return jsonify(error='Actualiza la página e inténtalo de nuevo.'),403

def logged_in(fn):
    @wraps(fn)
    def inner(*args,**kwargs):
        if not session.get('user_id'): return jsonify(error='Inicia sesión para guardar tu música.'),401
        return fn(*args,**kwargs)
    return inner

def admin(fn):
    @wraps(fn)
    @logged_in
    def inner(*args,**kwargs):
        user=query('SELECT role FROM users WHERE id=%s',(session['user_id'],),one=True)
        if not user or user['role']!='admin': return jsonify(error='Se requieren permisos de administrador.'),403
        return fn(*args,**kwargs)
    return inner

def data():
    value=request.get_json(silent=True)
    if not isinstance(value,dict): raise ValueError('Envía un objeto JSON válido.')
    return value

def validate_track(value):
    video_id,title=str(value.get('id','')),str(value.get('title','')).strip()
    artist,genre=str(value.get('artist','')).strip(),str(value.get('genre','YouTube')).strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]{11}',video_id) or not 1<=len(title)<=300 or not 1<=len(artist)<=300 or not 1<=len(genre)<=80: raise ValueError('Revisa el ID de YouTube, título, artista y género.')
    return video_id,title,artist,genre

@app.errorhandler(ValueError)
def invalid(error): return jsonify(error=str(error)),400

@app.errorhandler(mysql.connector.Error)
def sql_error(error):
    app.logger.error('Error MySQL: %s',type(error).__name__)
    return jsonify(error='No se pudo completar la operación en MySQL.'),503

@app.errorhandler(413)
def too_large(error): return jsonify(error='Solicitud demasiado grande.'),413

@app.get('/api/health')
def health():
    query('SELECT 1')
    return jsonify(ok=True,database='mysql',backend='python')

@app.get('/api/session')
def get_session():
    if 'csrf' not in session: session['csrf']=secrets.token_hex(24)
    user=query('SELECT id,name,email,role FROM users WHERE id=%s',(session['user_id'],),one=True) if session.get('user_id') else None
    return jsonify(user=user,csrf=session['csrf'])

@app.post('/api/register')
def register():
    value=data()
    email,name,password=str(value.get('email','')).strip().lower(),str(value.get('name','')).strip(),str(value.get('password',''))
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or len(email)>254 or not 1<=len(name)<=80 or not 10<=len(password)<=200: raise ValueError('Introduce un nombre, un email válido y una contraseña de 10 a 200 caracteres.')
    try: uid=write('INSERT INTO users(email,name,password_hash) VALUES(%s,%s,%s)',(email,name,generate_password_hash(password)))
    except mysql.connector.IntegrityError: return jsonify(error='Ese email ya está registrado.'),409
    session.clear();session.update(user_id=uid,csrf=secrets.token_hex(24));session.permanent=True
    return get_session(),201

@app.post('/api/login')
def login():
    value=data()
    user=query('SELECT * FROM users WHERE email=%s',(str(value.get('email','')).strip().lower(),),one=True)
    password=str(value.get('password',''))
    if len(password)>200 or not user or not check_password_hash(user['password_hash'],password): return jsonify(error='Email o contraseña incorrectos.'),401
    session.clear();session.update(user_id=user['id'],csrf=secrets.token_hex(24));session.permanent=True
    return get_session()

@app.post('/api/logout')
def logout():
    session.clear()
    return get_session()

@app.get('/api/library')
def library():
    uid=session.get('user_id',0)
    return jsonify(tracks=query('SELECT * FROM tracks WHERE visible=1 ORDER BY created_at,id'),favorites=[r['track_id'] for r in query('SELECT track_id FROM favorites WHERE user_id=%s',(uid,))],playlists=query('SELECT p.id,p.name,COUNT(pt.track_id) AS count FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id=p.id WHERE p.user_id=%s GROUP BY p.id,p.name ORDER BY p.id',(uid,)),configured=bool(os.getenv('YOUTUBE_API_KEY')))

@app.get('/api/search')
def search():
    q=request.args.get('q','').strip()[:150]
    if not q:return jsonify(tracks=[],source='local')
    key=os.getenv('YOUTUBE_API_KEY')
    if not key:return jsonify(tracks=query('SELECT * FROM tracks WHERE visible=1 AND (title LIKE %s OR artist LIKE %s)',(f'%{q}%',f'%{q}%')),source='local')
    params=urlencode(dict(part='snippet',type='video',videoCategoryId='10',videoEmbeddable='true',maxResults=20,q=q,key=key))
    try:
        with urlopen('https://www.googleapis.com/youtube/v3/search?'+params,timeout=12) as response: results=json.load(response)
        return jsonify(tracks=[dict(id=r['id']['videoId'],title=html.unescape(r['snippet']['title']),artist=html.unescape(r['snippet']['channelTitle']),genre='YouTube') for r in results.get('items',[])],source='youtube')
    except (HTTPError,URLError,TimeoutError):return jsonify(error='YouTube no responde. Revisa la clave, la cuota y tu conexión.'),502

def owned_playlist(pid):return query('SELECT id FROM playlists WHERE id=%s AND user_id=%s',(pid,session['user_id']),one=True)

@app.get('/api/playlists/<int:pid>')
@logged_in
def playlist(pid):
    if not owned_playlist(pid):return jsonify(error='La playlist no existe.'),404
    return jsonify(tracks=query('SELECT t.* FROM tracks t JOIN playlist_tracks pt ON pt.track_id=t.id WHERE pt.playlist_id=%s ORDER BY pt.added_at,t.id',(pid,)))

@app.post('/api/playlists')
@logged_in
def create_playlist():
    name=str(data().get('name','')).strip()
    if not 1<=len(name)<=60:raise ValueError('El nombre debe tener entre 1 y 60 caracteres.')
    pid=write('INSERT INTO playlists(name,user_id) VALUES(%s,%s)',(name,session['user_id']))
    return jsonify(id=pid,name=name),201

@app.post('/api/favorites')
@logged_in
def favorite():
    values=validate_track(data());uid=session['user_id']
    with pool.get_connection() as db:
        with db.cursor() as c:
            c.execute('INSERT IGNORE INTO tracks(id,title,artist,genre) VALUES(%s,%s,%s,%s)',values)
            c.execute('SELECT track_id FROM favorites WHERE user_id=%s AND track_id=%s FOR UPDATE',(uid,values[0]))
            exists=c.fetchone()
            if exists:c.execute('DELETE FROM favorites WHERE user_id=%s AND track_id=%s',(uid,values[0]))
            else:c.execute('INSERT INTO favorites(user_id,track_id) VALUES(%s,%s)',(uid,values[0]))
        db.commit()
    return jsonify(saved=not bool(exists))

@app.post('/api/playlists/<int:pid>/tracks')
@logged_in
def playlist_track(pid):
    if not owned_playlist(pid):return jsonify(error='La playlist no existe.'),404
    value=data();values=validate_track(value)
    with pool.get_connection() as db:
        with db.cursor() as c:
            c.execute('INSERT IGNORE INTO tracks(id,title,artist,genre) VALUES(%s,%s,%s,%s)',values)
            if value.get('remove'):c.execute('DELETE FROM playlist_tracks WHERE playlist_id=%s AND track_id=%s',(pid,values[0]))
            else:c.execute('INSERT IGNORE INTO playlist_tracks(playlist_id,track_id) VALUES(%s,%s)',(pid,values[0]))
        db.commit()
    return jsonify(ok=True)

@app.get('/api/admin')
@admin
def admin_data():return jsonify(tracks=query('SELECT * FROM tracks ORDER BY created_at DESC'),stats=query('SELECT (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM tracks) AS tracks,(SELECT COUNT(*) FROM playlists) AS playlists',one=True))

@app.post('/api/admin/tracks')
@admin
def admin_track():
    values=validate_track(data())
    write('INSERT INTO tracks(id,title,artist,genre,visible) VALUES(%s,%s,%s,%s,1) ON DUPLICATE KEY UPDATE title=VALUES(title),artist=VALUES(artist),genre=VALUES(genre),visible=1',values)
    return jsonify(ok=True)

@app.post('/api/admin/visibility')
@admin
def admin_visibility():
    value=data()
    write('UPDATE tracks SET visible=%s WHERE id=%s',(bool(value.get('visible')),str(value.get('id',''))))
    return jsonify(ok=True)

if __name__=='__main__':
    init_db()
    from waitress import serve
    print('API Python preparada.',flush=True)
    serve(app,host='127.0.0.1',port=int(os.getenv('PYTHON_PORT','8001')),threads=8)
