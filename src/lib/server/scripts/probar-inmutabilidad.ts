import db from '../sqlite';

try {
  db.prepare("UPDATE auditoria SET accion = 'manipulado' WHERE id = 1").run();
  console.log('❌ ERROR: el UPDATE pasó, la inmutabilidad no está activa');
} catch (error) {
  console.log('✅ Update bloqueado:', (error as Error).message);
}

try {
  db.prepare('DELETE FROM auditoria WHERE id = 1').run();
  console.log('❌ ERROR: el DELETE pasó, la inmutabilidad no está activa');
} catch (error) {
  console.log('✅ Borrado bloqueado:', (error as Error).message);
}