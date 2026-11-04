// Backend original para el avance académico. Node.js 18+; sin dependencias externas.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'clientes.json');
const UI = path.join(__dirname, 'public', 'index.html');
function leer() { try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return []; throw e; } }
function guardar(datos) { fs.writeFileSync(DATA, JSON.stringify(datos, null, 2)); }
function enviar(res, status, data) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); }
function recibir(req) { return new Promise((resolve,reject) => { let texto=''; req.on('data', c => {texto += c; if(texto.length>100000) {reject(new Error('Solicitud demasiado grande')); req.destroy();}}); req.on('end', () => {try {resolve(JSON.parse(texto || '{}'));} catch {reject(new Error('JSON inválido'));}}); req.on('error',reject); }); }
function validar(x) {
  const clave_sap = String(x.clave_sap || '').trim();
  const razon_social = String(x.razon_social || '').trim();
  const correo = String(x.contacto_correo || '').trim();
  const rfc = String(x.rfc || '').trim().toUpperCase();
  if (!clave_sap || clave_sap.length > 10) return 'La clave SAP es obligatoria y debe tener máximo 10 caracteres.';
  if (!razon_social || razon_social.length > 150) return 'La razón social es obligatoria (máximo 150 caracteres).';
  if (rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) return 'El RFC debe tener 12 o 13 caracteres con formato válido.';
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return 'El correo no es válido.';
  if (correo.length > 100 || String(x.contacto_nombre||'').length > 100 || String(x.domicilio_entrega||'').length > 250) return 'Algún campo excede su longitud permitida.';
  return null;
}
function limpiar(x) {return {clave_sap:String(x.clave_sap||'').trim(),razon_social:String(x.razon_social||'').trim(),rfc:String(x.rfc||'').trim().toUpperCase(),domicilio_entrega:String(x.domicilio_entrega||'').trim(),contacto_nombre:String(x.contacto_nombre||'').trim(),contacto_correo:String(x.contacto_correo||'').trim(),requiere_certificado:Boolean(x.requiere_certificado)};}
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if(req.method==='GET' && url.pathname==='/') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(UI));}
    if(req.method==='GET' && url.pathname==='/api/clientes') return enviar(res,200,leer());
    if(req.method==='POST' && url.pathname==='/api/clientes') {
      const body=await recibir(req), error=validar(body); if(error) return enviar(res,400,{error});
      const rows=leer(), item=limpiar(body);
      if(rows.some(c=>c.clave_sap.toLowerCase()===item.clave_sap.toLowerCase())) return enviar(res,409,{error:'Esta clave SAP ya está registrada.'});
      const nuevo={id:crypto.randomUUID(),...item,estatus:'ACT',fecha_alta:new Date().toISOString()};rows.push(nuevo);guardar(rows);return enviar(res,201,nuevo);
    }
    const match=url.pathname.match(/^\/api\/clientes\/([a-f0-9-]+)$/);
    if(match && (req.method==='PUT'||req.method==='PATCH')) {
      const rows=leer(),i=rows.findIndex(c=>c.id===match[1]); if(i<0) return enviar(res,404,{error:'Cliente no encontrado.'});
      if(req.method==='PATCH') {rows[i].estatus=rows[i].estatus==='ACT'?'INA':'ACT';guardar(rows);return enviar(res,200,rows[i]);}
      const body=await recibir(req),error=validar(body);if(error)return enviar(res,400,{error});
      const item=limpiar(body);if(rows.some(c=>c.id!==match[1]&&c.clave_sap.toLowerCase()===item.clave_sap.toLowerCase()))return enviar(res,409,{error:'Clave SAP repetida.'});
      rows[i]={...rows[i],...item};guardar(rows);return enviar(res,200,rows[i]);
    }
    return enviar(res,404,{error:'Ruta no encontrada.'});
  } catch(e) {console.error(e);if(!res.headersSent)enviar(res,500,{error:'Error de servidor.'});}
});
server.listen(PORT,()=>console.log(`Sistema en http://localhost:${PORT}`));
