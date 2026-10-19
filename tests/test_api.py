"""Pruebas de integración contra la base configurada; eliminan sus propios usuarios."""
import sys
import unittest
import uuid
from unittest.mock import patch, MagicMock
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import app as backend

class Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):backend.init_db()

    def setUp(self):
        self.prefix=uuid.uuid4().hex
        self.clients=[]
        self.headers={'X-Internal-Token':backend.INTERNAL_TOKEN}
        for n in range(2):
            client=backend.app.test_client()
            token=client.get('/api/session',headers=self.headers).json['csrf']
            response=client.post('/api/register',json={'email':f'{self.prefix}{n}@test.invalid','name':f'Test {n}','password':'UnaClaveDePrueba123!'},headers={**self.headers,'X-CSRF-Token':token})
            self.assertEqual(response.status_code,201,response.json)
            self.clients.append((client,{**self.headers,'X-CSRF-Token':response.json['csrf']},response.json['user']['id']))

    def tearDown(self):
        for _,_,uid in self.clients:backend.write('DELETE FROM users WHERE id=%s',(uid,))

    def test_auth_and_csrf(self):
        c,h,_=self.clients[0]
        self.assertEqual(c.post('/api/playlists',json={'name':'x'},headers=self.headers).status_code,403)
        self.assertEqual(c.get('/api/session').status_code,403)
        self.assertEqual(c.get('/api/admin',headers=h).status_code,403)
        self.assertEqual(c.post('/api/login',json={'email':'nobody@test.invalid','password':'incorrecta'},headers=h).status_code,401)
        r=c.post('/api/logout',json={},headers=h)
        self.assertIsNone(r.json['user'])
        self.assertEqual(c.post('/api/playlists',json={'name':'x'},headers={**h,'X-CSRF-Token':r.json['csrf']}).status_code,401)

    def test_playlist_ownership_and_favorites(self):
        c,h,_=self.clients[0];other,oh,_=self.clients[1]
        t=c.get('/api/library',headers=h).json['tracks'][0]
        pid=c.post('/api/playlists',json={'name':"Mi música ' OR 1=1 --"},headers=h).json['id']
        self.assertEqual(c.post(f'/api/playlists/{pid}/tracks',json=t,headers=h).status_code,200)
        self.assertEqual(len(c.get(f'/api/playlists/{pid}',headers=h).json['tracks']),1)
        self.assertEqual(other.get(f'/api/playlists/{pid}',headers=oh).status_code,404)
        self.assertEqual(other.post(f'/api/playlists/{pid}/tracks',json=t,headers=oh).status_code,404)
        self.assertTrue(c.post('/api/favorites',json=t,headers=h).json['saved'])
        self.assertEqual(other.get('/api/library',headers=oh).json['favorites'],[])
        self.assertFalse(c.post('/api/favorites',json=t,headers=h).json['saved'])
        self.assertEqual(c.post(f'/api/playlists/{pid}/tracks',json={**t,'remove':True},headers=h).status_code,200)
        self.assertEqual(c.get(f'/api/playlists/{pid}',headers=h).json['tracks'],[])

    def test_admin_catalog_and_validation(self):
        c,h,uid=self.clients[0]
        backend.write("UPDATE users SET role='admin' WHERE id=%s",(uid,))
        self.assertEqual(c.get('/api/admin',headers=h).status_code,200)
        self.assertEqual(c.post('/api/admin/tracks',json={'id':'invalid'},headers=h).status_code,400)
        tid='test_'+self.prefix[:6]
        try:
            self.assertEqual(c.post('/api/admin/tracks',json={'id':tid,'title':'Prueba','artist':'Equipo','genre':'Pop'},headers=h).status_code,200)
            self.assertEqual(c.post('/api/admin/visibility',json={'id':tid,'visible':False},headers=h).status_code,200)
            self.assertNotIn(tid,[t['id'] for t in c.get('/api/library',headers=h).json['tracks']])
        finally:backend.write('DELETE FROM tracks WHERE id=%s',(tid,))

    def test_login_and_local_search(self):
        c,h,_=self.clients[0]
        out=c.post('/api/logout',json={},headers=h)
        login=c.post('/api/login',json={'email':f'{self.prefix}0@test.invalid','password':'UnaClaveDePrueba123!'},headers={**h,'X-CSRF-Token':out.json['csrf']})
        self.assertEqual(login.status_code,200)
        self.assertEqual(login.json['user']['name'],'Test 0')
        self.assertIn('HttpOnly',login.headers['Set-Cookie'])
        self.assertEqual(c.get('/api/search?q=Queen',headers=h).status_code,200)

    def test_youtube_results_and_error(self):
        c,h,_=self.clients[0]
        response=MagicMock()
        response.__enter__.return_value.read.return_value=b'{"items":[{"id":{"videoId":"4NRXx6U8ABQ"},"snippet":{"title":"Rock &amp; Pop","channelTitle":"Artist"}}]}'
        with patch.dict(backend.os.environ,{'YOUTUBE_API_KEY':'test-key'}),patch.object(backend,'urlopen',return_value=response):
            result=c.get('/api/search?q=music',headers=h)
            self.assertEqual(result.json['source'],'youtube')
            self.assertEqual(result.json['tracks'][0]['title'],'Rock & Pop')
        with patch.dict(backend.os.environ,{'YOUTUBE_API_KEY':'test-key'}),patch.object(backend,'urlopen',side_effect=backend.URLError('offline')):
            self.assertEqual(c.get('/api/search?q=music',headers=h).status_code,502)

if __name__=='__main__':unittest.main(verbosity=2)
