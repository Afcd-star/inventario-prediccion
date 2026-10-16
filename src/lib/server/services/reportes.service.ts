import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import db from '../database';
import type { Producto } from '../../types';
import { VERSION } from '$lib/version';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Colores de la marca
const COLORES = {
  primario: [59, 130, 246],
  secundario: [139, 92, 246],
  texto: [17, 24, 39],
  textoClaro: [107, 114, 128],
  fondo: [249, 250, 251],
  blanco: [255, 255, 255],
  exito: [16, 185, 129],
  peligro: [239, 68, 68],
  advertencia: [245, 158, 11]
} satisfies Record<string, [number, number, number]>;

export const reportesService = {
  generarReporteInventario: () => {
    const doc = new jsPDF();
    
    // ===== HEADER CON BRANDING =====
    doc.setFillColor(...COLORES.primario);
    doc.rect(0, 0, 210, 45, 'F');
    
    // Logo y título
    doc.setTextColor(...COLORES.blanco);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('StockPredict Pro', 14, 22);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Inventario', 14, 32);
    
    doc.setFontSize(9);
    doc.text('Sistema de Gestión Inteligente de Stock', 14, 39);
    
    // ===== INFO DEL REPORTE =====
    doc.setTextColor(...COLORES.textoClaro);
    doc.setFontSize(10);
    const fecha = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generado: ${fecha}`, 14, 55);
    
    // ===== OBTENER DATOS =====
    const productos = db.prepare('SELECT * FROM productos ORDER BY nombre').all() as Producto[];
    
    const datosTabla = productos.map(p => [
      p.id.toString(),
      p.nombre,
      `$${p.precio.toFixed(2)}`,
      p.stock_actual.toString(),
      p.stock_minimo.toString(),
      p.stock_actual < p.stock_minimo ? 'BAJO' : 'OK'
    ]);
    
    // ===== TABLA DE PRODUCTOS =====
    autoTable(doc, {
      startY: 62,
      head: [['ID', 'Nombre', 'Precio', 'Stock Actual', 'Stock Mín', 'Estado']],
      body: datosTabla,
      theme: 'striped',
      headStyles: {
        fillColor: COLORES.primario,
        textColor: COLORES.blanco,
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: COLORES.fondo
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      },
      didParseCell: (data: any) => {
        // Colorear celdas de estado
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'BAJO') {
            data.cell.styles.textColor = COLORES.peligro;
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = COLORES.exito;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    
    // ===== RESUMEN ESTADÍSTICO =====
    const totalProductos = productos.length;
    const stockBajo = productos.filter(p => p.stock_actual < p.stock_minimo).length;
    const valorTotal = productos.reduce((acc, p) => acc + (p.precio * p.stock_actual), 0);
    const stockTotal = productos.reduce((acc, p) => acc + p.stock_actual, 0);
    
    const finalY = doc.lastAutoTable.finalY + 15;
    
    // Caja de resumen
    doc.setFillColor(...COLORES.fondo);
    doc.setDrawColor(...COLORES.primario);
    doc.roundedRect(14, finalY - 5, 182, 55, 3, 3, 'FD');
    
    doc.setTextColor(...COLORES.texto);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen del Inventario', 20, finalY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORES.textoClaro);
    
    const resumenData = [
      ['Total de productos:', totalProductos.toString()],
      ['Productos con stock bajo:', stockBajo.toString()],
      ['Unidades totales en stock:', stockTotal.toString()],
      ['Valor total del inventario:', `$${valorTotal.toFixed(2)}`]
    ];
    
    resumenData.forEach((fila, index) => {
      const y = finalY + 15 + (index * 8);
      doc.text(fila[0], 20, y);
      doc.setTextColor(...COLORES.texto);
      doc.setFont('helvetica', 'bold');
      doc.text(fila[1], 100, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORES.textoClaro);
    });
    
    // ===== FOOTER EN TODAS LAS PÁGINAS =====
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLORES.textoClaro);
      doc.text(
        `Página ${i} de ${pageCount}`,
        14,
        290
      );
      doc.text(
        `StockPredict Pro v${VERSION} - Sistema de Gestión de Inventario`, 
        105, 
        290, 
        { align: 'center' }
      );
      doc.text(
        `Reporte generado el ${new Date().toLocaleDateString('es-ES')}`,
        196,
        290,
        { align: 'right' }
      );
      
      // Línea separadora
      doc.setDrawColor(...COLORES.primario);
      doc.setLineWidth(0.3);
      doc.line(14, 285, 196, 285);
    }
    
    return doc;
  },
  
  generarReporteMovimientos: (productoId: number) => {
    const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(productoId) as Producto;
    const movimientos = db.prepare(
      'SELECT * FROM movimientos WHERE producto_id = ? ORDER BY fecha DESC'
    ).all(productoId) as Array<{
      id: number;
      tipo: string;
      cantidad: number;
      fecha: string;
      notas: string | null;
    }>;
    
    const doc = new jsPDF();
    
    // ===== HEADER =====
    doc.setFillColor(...COLORES.primario);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(...COLORES.blanco);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('StockPredict Pro', 14, 22);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Movimientos', 14, 32);
    
    // ===== INFO DEL PRODUCTO =====
    doc.setTextColor(...COLORES.texto);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Producto:', 14, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(producto.nombre, 40, 55);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Stock actual:', 14, 63);
    doc.setFont('helvetica', 'normal');
    doc.text(String(producto.stock_actual), 40, 63);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha del reporte:', 14, 71);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(fecha, 40, 71);
    
    // ===== TABLA DE MOVIMIENTOS =====
    const datosTabla = movimientos.map(m => [
      new Date(m.fecha).toLocaleString('es-ES'),
      m.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA',
      `${m.tipo === 'entrada' ? '+' : '-'}${m.cantidad}`,
      m.notas || '-'
    ]);
    
    autoTable(doc, {
      startY: 80,
      head: [['Fecha', 'Tipo', 'Cantidad', 'Notas']],
      body: datosTabla,
      theme: 'striped',
      headStyles: {
        fillColor: COLORES.primario,
        textColor: COLORES.blanco,
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 'auto' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'ENTRADA') {
            data.cell.styles.textColor = COLORES.exito;
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = COLORES.peligro;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    
    // ===== RESUMEN =====
    const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.cantidad, 0);
    const totalSalidas = movimientos.filter(m => m.tipo === 'salida').reduce((acc, m) => acc + m.cantidad, 0);
    
    const finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFillColor(...COLORES.fondo);
    doc.setDrawColor(...COLORES.primario);
    doc.roundedRect(14, finalY - 5, 182, 40, 3, 3, 'FD');
    
    doc.setTextColor(...COLORES.texto);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Movimientos', 20, finalY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORES.textoClaro);
    
    doc.text('Total de movimientos:', 20, finalY + 15);
    doc.setTextColor(...COLORES.texto);
    doc.setFont('helvetica', 'bold');
    doc.text(movimientos.length.toString(), 100, finalY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORES.exito);
    doc.text('Total entradas:', 20, finalY + 23);
    doc.text(`+${totalEntradas}`, 100, finalY + 23);
    
    doc.setTextColor(...COLORES.peligro);
    doc.text('Total salidas:', 20, finalY + 31);
    doc.text(`-${totalSalidas}`, 100, finalY + 31);
    
    // ===== FOOTER =====
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLORES.textoClaro);
      doc.text(`Página ${i} de ${pageCount}`, 14, 290);
      doc.text(`StockPredict Pro v${VERSION}`, 105, 290, { align: 'center' });
      doc.setDrawColor(...COLORES.primario);
      doc.setLineWidth(0.3);
      doc.line(14, 285, 196, 285);
    }
    
    return doc;
  }
};