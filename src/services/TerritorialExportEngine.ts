import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import Papa from 'papaparse';
import type {
  TerritorialEntity,
  TerritorialOwner,
  TerritorialLocation,
  TerritorialClassification,
  TerritorialCoverageMetric,
  TerritorialDensityMetric,
  TerritorialOpportunityMetric,
  TerritorialGapAnalysis,
  TerritorialAssignment,
  TerritorialPotentialScore,
} from '../types';

export type ExportSource =
  | 'registry'
  | 'intelligence'
  | 'atlas'
  | 'opportunities'
  | 'coverage'
  | 'density'
  | 'gaps'
  | 'assignments'
  | 'potential';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'pptx';

export interface ExportConfig {
  source: ExportSource;
  format: ExportFormat;
  filename: string;
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  includeTimestamp?: boolean;
  filters?: Record<string, unknown>;
}

export interface RegistryExportData {
  entities: TerritorialEntity[];
  owners: TerritorialOwner[];
  locations: TerritorialLocation[];
  classifications: TerritorialClassification[];
}

export interface IntelligenceExportData {
  coverage: TerritorialCoverageMetric[];
  density: TerritorialDensityMetric[];
  opportunities: TerritorialOpportunityMetric[];
  gaps: TerritorialGapAnalysis[];
}

export interface AtlasExportData {
  entities: TerritorialEntity[];
  locations: TerritorialLocation[];
  owners: TerritorialOwner[];
  assignments: TerritorialAssignment[];
}

export interface OpportunityExportData {
  opportunities: TerritorialOpportunityMetric[];
  gaps: TerritorialGapAnalysis[];
  potentialScores: TerritorialPotentialScore[];
}

export type ExportData =
  | RegistryExportData
  | IntelligenceExportData
  | AtlasExportData
  | OpportunityExportData
  | Record<string, unknown>[];

class TerritorialExportEngine {
  private formatDate(d: string | Date | null): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString();
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9\-_]/g, '_');
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // PDF Export
  // ============================================================
  async exportPDF(config: ExportConfig, data: ExportData): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(config.title ?? 'Territorial Export', 14, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (config.subtitle) doc.text(config.subtitle, 14, 19);

    let startY = 28;

    if (config.includeTimestamp !== false) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`Generated: ${now}`, 14, startY);
      startY += 6;
    }

    const source = config.source;

    if (source === 'registry' && this.isRegistryData(data)) {
      startY = this.writeRegistryPDF(doc, data, startY);
    } else if (source === 'intelligence' && this.isIntelligenceData(data)) {
      startY = this.writeIntelligencePDF(doc, data, startY);
    } else if (source === 'atlas' && this.isAtlasData(data)) {
      startY = this.writeAtlasPDF(doc, data, startY);
    } else if (source === 'opportunities' && this.isOpportunityData(data)) {
      startY = this.writeOpportunitiesPDF(doc, data, startY);
    } else if (Array.isArray(data)) {
      startY = this.writeGenericArrayPDF(doc, data, startY);
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 6);
    }

    const blob = doc.output('blob');
    this.triggerDownload(blob, `${this.sanitizeFilename(config.filename)}.pdf`);
  }

  private writeRegistryPDF(doc: jsPDF, data: RegistryExportData, startY: number): number {
    if (data.entities.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Entities', 14, startY);
      autoTable(doc, {
        startY: startY + 2,
        head: [['NODX UID', 'Business Name', 'Commercial Name', 'Legal Name', 'Active']],
        body: data.entities.map(e => [
          e.nodx_uid, e.business_name, e.commercial_name ?? '', e.legal_name ?? '', e.is_active ? 'Yes' : 'No',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    if (data.owners.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Owners', 14, startY + 6);
      autoTable(doc, {
        startY: startY + 8,
        head: [['Name', 'Known Name', 'Phone', 'Mobile', 'Email']],
        body: data.owners.map(o => [o.name, o.known_name ?? '', o.phone ?? '', o.mobile ?? '', o.email ?? '']),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    if (data.locations.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Locations', 14, startY + 6);
      autoTable(doc, {
        startY: startY + 8,
        head: [['Country', 'Province', 'Municipality', 'District', 'Address', 'Lat', 'Lng']],
        body: data.locations.map(l => [
          l.country ?? '', l.province ?? '', l.municipality ?? '', l.district ?? '', l.address ?? '',
          l.latitude?.toString() ?? '', l.longitude?.toString() ?? '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    return startY;
  }

  private writeIntelligencePDF(doc: jsPDF, data: IntelligenceExportData, startY: number): number {
    if (data.coverage.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Coverage Metrics', 14, startY);
      autoTable(doc, {
        startY: startY + 2,
        head: [['Geo Level', 'Geo Name', 'Total', 'Active', 'Assigned', 'Visited', 'Coverage %']],
        body: data.coverage.map(c => [
          c.geo_level, c.geo_name, c.total_establishments, c.active_establishments,
          c.assigned_establishments, c.visited_establishments,
          c.coverage_pct ? `${(c.coverage_pct * 100).toFixed(1)}%` : '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    if (data.density.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Density Metrics', 14, startY + 6);
      autoTable(doc, {
        startY: startY + 8,
        head: [['Geo Level', 'Geo Name', 'Count', 'Area km²', 'Density/km²', 'Class']],
        body: data.density.map(d => [
          d.geo_level, d.geo_name, d.establishment_count, d.area_km2 ?? '',
          d.density_per_km2 ? d.density_per_km2.toFixed(2) : '', d.density_class ?? '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    if (data.opportunities.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Opportunities', 14, startY + 6);
      autoTable(doc, {
        startY: startY + 8,
        head: [['Geo Level', 'Geo Name', 'Type', 'Current', 'Potential', 'Confidence']],
        body: data.opportunities.map(o => [
          o.geo_level, o.geo_name, o.opportunity_type, o.current_establishments,
          o.estimated_potential ?? '', o.confidence_score ? `${(o.confidence_score * 100).toFixed(0)}%` : '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    return startY;
  }

  private writeAtlasPDF(doc: jsPDF, data: AtlasExportData, startY: number): number {
    const combined = data.entities.map(e => {
      const loc = data.locations.find(l => l.entity_id === e.id);
      const own = data.owners.find(o => o.entity_id === e.id);
      const asgn = data.assignments.find(a => a.entity_id === e.id);
      return {
        uid: e.nodx_uid,
        name: e.business_name,
        commercial: e.commercial_name ?? '',
        owner: own?.name ?? '',
        phone: own?.phone ?? '',
        municipality: loc?.municipality ?? '',
        lat: loc?.latitude ?? '',
        lng: loc?.longitude ?? '',
        assigned: asgn?.is_active ? 'Yes' : 'No',
      };
    });

    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.text('Atlas — Combined View', 14, startY);
    autoTable(doc, {
      startY: startY + 2,
      head: [['NODX UID', 'Business Name', 'Commercial Name', 'Owner', 'Phone', 'Municipality', 'Lat', 'Lng', 'Assigned']],
      body: combined.map(c => [
        c.uid, c.name, c.commercial, c.owner, c.phone, c.municipality,
        c.lat?.toString() ?? '', c.lng?.toString() ?? '', c.assigned,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
  }

  private writeOpportunitiesPDF(doc: jsPDF, data: OpportunityExportData, startY: number): number {
    if (data.opportunities.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Expansion Opportunities', 14, startY);
      autoTable(doc, {
        startY: startY + 2,
        head: [['Geo Level', 'Geo Name', 'Type', 'Current', 'Potential', 'Confidence']],
        body: data.opportunities.map(o => [
          o.geo_level, o.geo_name, o.opportunity_type, o.current_establishments,
          o.estimated_potential ?? '', o.confidence_score ? `${(o.confidence_score * 100).toFixed(0)}%` : '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    if (data.gaps.length > 0) {
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(11);
      doc.text('Gap Analysis', 14, startY + 6);
      autoTable(doc, {
        startY: startY + 8,
        head: [['Geo Level', 'Geo Name', 'Gap Type', 'Current', 'Expected', 'Gap %', 'Severity']],
        body: data.gaps.map(g => [
          g.geo_level, g.geo_name, g.gap_type, g.current_value ?? '', g.expected_value ?? '',
          g.gap_pct ? `${(g.gap_pct * 100).toFixed(1)}%` : '', g.severity ?? '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
    }

    return startY;
  }

  private writeGenericArrayPDF(doc: jsPDF, data: Record<string, unknown>[], startY: number): number {
    if (data.length === 0) return startY;
    const keys = Object.keys(data[0]);
    autoTable(doc, {
      startY: startY + 2,
      head: [keys.map(k => k.replace(/_/g, ' ').toUpperCase())],
      body: data.map(row => keys.map(k => String(row[k] ?? ''))),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
    return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
  }

  // ============================================================
  // Excel Export — safe implementation, no repair loops
  // ============================================================
  async exportExcel(config: ExportConfig, data: ExportData): Promise<void> {
    try {
      const wb = XLSX.utils.book_new();

      const source = config.source;

      if (source === 'registry' && this.isRegistryData(data)) {
        this.addRegistrySheets(wb, data);
      } else if (source === 'intelligence' && this.isIntelligenceData(data)) {
        this.addIntelligenceSheets(wb, data);
      } else if (source === 'atlas' && this.isAtlasData(data)) {
        this.addAtlasSheet(wb, data);
      } else if (source === 'opportunities' && this.isOpportunityData(data)) {
        this.addOpportunitiesSheets(wb, data);
      } else if (Array.isArray(data)) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Data');
      } else {
        // Safe placeholder — write a minimal sheet so export always completes
        const ws = XLSX.utils.aoa_to_sheet([['Export'], ['No data available']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
      }

      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      this.triggerDownload(blob, `${this.sanitizeFilename(config.filename)}.xlsx`);
    } catch {
      // Safe fallback — deliver a minimal workbook rather than throwing
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['NODX Export'], ['Data could not be formatted'], [config.source], [new Date().toISOString()]]);
      XLSX.utils.book_append_sheet(wb, ws, 'Export');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      this.triggerDownload(blob, `${this.sanitizeFilename(config.filename)}.xlsx`);
    }
  }

  private addRegistrySheets(wb: XLSX.WorkBook, data: RegistryExportData) {
    if (data.entities.length) {
      const ws = XLSX.utils.json_to_sheet(data.entities.map(e => ({
        'NODX UID': e.nodx_uid,
        'Business Name': e.business_name,
        'Commercial Name': e.commercial_name ?? '',
        'Legal Name': e.legal_name ?? '',
        'Active': e.is_active ? 'Yes' : 'No',
        'Created At': this.formatDate(e.created_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Entities');
    }
    if (data.owners.length) {
      const ws = XLSX.utils.json_to_sheet(data.owners.map(o => ({
        'Name': o.name,
        'Known Name': o.known_name ?? '',
        'Phone': o.phone ?? '',
        'Mobile': o.mobile ?? '',
        'WhatsApp': o.whatsapp ?? '',
        'Email': o.email ?? '',
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Owners');
    }
    if (data.locations.length) {
      const ws = XLSX.utils.json_to_sheet(data.locations.map(l => ({
        'Country': l.country ?? '',
        'Province': l.province ?? '',
        'Municipality': l.municipality ?? '',
        'District': l.district ?? '',
        'Sector': l.sector ?? '',
        'Neighborhood': l.neighborhood ?? '',
        'Address': l.address ?? '',
        'Latitude': l.latitude ?? '',
        'Longitude': l.longitude ?? '',
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Locations');
    }
    if (data.classifications.length) {
      const ws = XLSX.utils.json_to_sheet(data.classifications.map(c => ({
        'Business Type': c.business_type ?? '',
        'Size': c.size ?? '',
        'Potential': c.potential ?? '',
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Classifications');
    }
  }

  private addIntelligenceSheets(wb: XLSX.WorkBook, data: IntelligenceExportData) {
    if (data.coverage.length) {
      const ws = XLSX.utils.json_to_sheet(data.coverage.map(c => ({
        'Geo Level': c.geo_level,
        'Geo Name': c.geo_name,
        'Total Establishments': c.total_establishments,
        'Active': c.active_establishments,
        'Assigned': c.assigned_establishments,
        'Visited': c.visited_establishments,
        'Coverage %': c.coverage_pct ? (c.coverage_pct * 100).toFixed(1) : '',
        'Calculated At': this.formatDate(c.calculated_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Coverage');
    }
    if (data.density.length) {
      const ws = XLSX.utils.json_to_sheet(data.density.map(d => ({
        'Geo Level': d.geo_level,
        'Geo Name': d.geo_name,
        'Count': d.establishment_count,
        'Area km²': d.area_km2 ?? '',
        'Density/km²': d.density_per_km2 ?? '',
        'Density Class': d.density_class ?? '',
        'Calculated At': this.formatDate(d.calculated_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Density');
    }
    if (data.opportunities.length) {
      const ws = XLSX.utils.json_to_sheet(data.opportunities.map(o => ({
        'Geo Level': o.geo_level,
        'Geo Name': o.geo_name,
        'Type': o.opportunity_type,
        'Current': o.current_establishments,
        'Potential': o.estimated_potential ?? '',
        'Confidence %': o.confidence_score ? (o.confidence_score * 100).toFixed(0) : '',
        'Calculated At': this.formatDate(o.calculated_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Opportunities');
    }
    if (data.gaps.length) {
      const ws = XLSX.utils.json_to_sheet(data.gaps.map(g => ({
        'Geo Level': g.geo_level,
        'Geo Name': g.geo_name,
        'Gap Type': g.gap_type,
        'Current': g.current_value ?? '',
        'Expected': g.expected_value ?? '',
        'Gap %': g.gap_pct ? (g.gap_pct * 100).toFixed(1) : '',
        'Severity': g.severity ?? '',
        'Calculated At': this.formatDate(g.calculated_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Gaps');
    }
  }

  private addAtlasSheet(wb: XLSX.WorkBook, data: AtlasExportData) {
    const combined = data.entities.map(e => {
      const loc = data.locations.find(l => l.entity_id === e.id);
      const own = data.owners.find(o => o.entity_id === e.id);
      const asgn = data.assignments.find(a => a.entity_id === e.id);
      return {
        'NODX UID': e.nodx_uid,
        'Business Name': e.business_name,
        'Commercial Name': e.commercial_name ?? '',
        'Owner': own?.name ?? '',
        'Phone': own?.phone ?? '',
        'Municipality': loc?.municipality ?? '',
        'Latitude': loc?.latitude ?? '',
        'Longitude': loc?.longitude ?? '',
        'Assigned': asgn?.is_active ? 'Yes' : 'No',
      };
    });
    const ws = XLSX.utils.json_to_sheet(combined);
    XLSX.utils.book_append_sheet(wb, ws, 'Atlas');
  }

  private addOpportunitiesSheets(wb: XLSX.WorkBook, data: OpportunityExportData) {
    if (data.opportunities.length) {
      const ws = XLSX.utils.json_to_sheet(data.opportunities.map(o => ({
        'Geo Level': o.geo_level,
        'Geo Name': o.geo_name,
        'Type': o.opportunity_type,
        'Current': o.current_establishments,
        'Potential': o.estimated_potential ?? '',
        'Confidence %': o.confidence_score ? (o.confidence_score * 100).toFixed(0) : '',
        'Calculated At': this.formatDate(o.calculated_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Opportunities');
    }
    if (data.gaps.length) {
      const ws = XLSX.utils.json_to_sheet(data.gaps.map(g => ({
        'Geo Level': g.geo_level,
        'Geo Name': g.geo_name,
        'Gap Type': g.gap_type,
        'Current': g.current_value ?? '',
        'Expected': g.expected_value ?? '',
        'Gap %': g.gap_pct ? (g.gap_pct * 100).toFixed(1) : '',
        'Severity': g.severity ?? '',
        'Calculated At': this.formatDate(g.calculated_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Gaps');
    }
    if (data.potentialScores.length) {
      const ws = XLSX.utils.json_to_sheet(data.potentialScores.map(p => ({
        'Entity ID': p.entity_id,
        'Potential Score': p.potential_score ?? '',
        'Confidence %': p.confidence_score ? (p.confidence_score * 100).toFixed(0) : '',
        'Last Calculated': this.formatDate(p.last_calculated_at),
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Potential Scores');
    }
  }

  // ============================================================
  // CSV Export
  // ============================================================
  async exportCSV(config: ExportConfig, data: ExportData): Promise<void> {
    let rows: Record<string, unknown>[] = [];

    if (config.source === 'registry' && this.isRegistryData(data)) {
      rows = data.entities.map(e => ({
        nodx_uid: e.nodx_uid,
        business_name: e.business_name,
        commercial_name: e.commercial_name ?? '',
        legal_name: e.legal_name ?? '',
        is_active: e.is_active,
        created_at: e.created_at,
      }));
    } else if (config.source === 'intelligence' && this.isIntelligenceData(data)) {
      rows = [...data.coverage as unknown as Record<string, unknown>[], ...data.density as unknown as Record<string, unknown>[]];
    } else if (config.source === 'atlas' && this.isAtlasData(data)) {
      rows = data.entities.map(e => {
        const loc = data.locations.find(l => l.entity_id === e.id);
        const own = data.owners.find(o => o.entity_id === e.id);
        return {
          nodx_uid: e.nodx_uid,
          business_name: e.business_name,
          owner_name: own?.name ?? '',
          municipality: loc?.municipality ?? '',
          latitude: loc?.latitude ?? '',
          longitude: loc?.longitude ?? '',
        };
      });
    } else if (config.source === 'opportunities' && this.isOpportunityData(data)) {
      rows = [...data.opportunities as unknown as Record<string, unknown>[], ...data.gaps as unknown as Record<string, unknown>[]];
    } else if (Array.isArray(data)) {
      rows = data;
    }

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `${this.sanitizeFilename(config.filename)}.csv`);
  }

  // ============================================================
  // PowerPoint Export
  // ============================================================
  async exportPowerPoint(config: ExportConfig, data: ExportData): Promise<void> {
    const ppt = new PptxGenJS();
    ppt.layout = 'LAYOUT_16x9';
    ppt.author = 'NODX Enterprise';
    ppt.title = config.title ?? 'Territorial Export';
    ppt.subject = config.subtitle ?? '';

    const titleSlide = ppt.addSlide();
    titleSlide.background = { color: '1E3A8A' };
    titleSlide.addText(config.title ?? 'Territorial Export', {
      x: 1, y: 2, w: '80%', h: 1,
      fontSize: 36, color: 'FFFFFF', bold: true, align: 'center',
    });
    if (config.subtitle) {
      titleSlide.addText(config.subtitle, {
        x: 1, y: 3.2, w: '80%', h: 0.5,
        fontSize: 18, color: 'E2E8F0', align: 'center',
      });
    }
    titleSlide.addText(`Generated: ${new Date().toLocaleString()}`, {
      x: 1, y: 4.5, w: '80%', h: 0.3,
      fontSize: 10, color: '94A3B8', align: 'center',
    });

    const source = config.source;

    if (source === 'registry' && this.isRegistryData(data)) {
      this.addRegistrySlides(ppt, data);
    } else if (source === 'intelligence' && this.isIntelligenceData(data)) {
      this.addIntelligenceSlides(ppt, data);
    } else if (source === 'atlas' && this.isAtlasData(data)) {
      this.addAtlasSlides(ppt, data);
    } else if (source === 'opportunities' && this.isOpportunityData(data)) {
      this.addOpportunitiesSlides(ppt, data);
    } else if (Array.isArray(data) && data.length > 0) {
      this.addGenericSlides(ppt, data);
    }

    const summarySlide = ppt.addSlide();
    summarySlide.addText('Export Summary', { x: 0.5, y: 0.5, fontSize: 24, color: '1E3A8A', bold: true });
    summarySlide.addText(`Source: ${source}\nFormat: ${config.format}\nGenerated: ${new Date().toLocaleString()}`, {
      x: 0.5, y: 1.5, w: '90%', h: 2, fontSize: 14, color: '475569',
    });

    await ppt.writeFile({ fileName: `${this.sanitizeFilename(config.filename)}.pptx` });
  }

  private addRegistrySlides(ppt: PptxGenJS, data: RegistryExportData) {
    if (data.entities.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Entities Overview', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.entities.slice(0, 12).map(e => [e.nodx_uid, e.business_name, e.commercial_name ?? '', e.is_active ? 'Yes' : 'No']),
        { x: 0.5, y: 1.2, w: 9, colW: [2, 3, 3, 1], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
    if (data.owners.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Owners', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.owners.slice(0, 12).map(o => [o.name, o.phone ?? '', o.email ?? '']),
        { x: 0.5, y: 1.2, w: 9, colW: [3, 3, 3], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
    if (data.locations.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Locations', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.locations.slice(0, 12).map(l => [l.municipality ?? '', l.district ?? '', l.address ?? '']),
        { x: 0.5, y: 1.2, w: 9, colW: [3, 3, 3], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
  }

  private addIntelligenceSlides(ppt: PptxGenJS, data: IntelligenceExportData) {
    if (data.coverage.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Coverage Metrics', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.coverage.slice(0, 10).map(c => [
          c.geo_name, c.total_establishments.toString(), c.active_establishments.toString(),
          c.coverage_pct ? `${(c.coverage_pct * 100).toFixed(1)}%` : '',
        ]),
        { x: 0.5, y: 1.2, w: 9, colW: [3, 2, 2, 2], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
    if (data.density.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Density Metrics', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.density.slice(0, 10).map(d => [
          d.geo_name, d.establishment_count.toString(), d.density_per_km2?.toFixed(2) ?? '', d.density_class ?? '',
        ]),
        { x: 0.5, y: 1.2, w: 9, colW: [3, 2, 2, 2], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
    if (data.opportunities.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Opportunities', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.opportunities.slice(0, 10).map(o => [
          o.geo_name, o.opportunity_type, o.current_establishments.toString(),
          o.confidence_score ? `${(o.confidence_score * 100).toFixed(0)}%` : '',
        ]),
        { x: 0.5, y: 1.2, w: 9, colW: [3, 2, 2, 2], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
  }

  private addAtlasSlides(ppt: PptxGenJS, data: AtlasExportData) {
    const combined = data.entities.slice(0, 10).map(e => {
      const loc = data.locations.find(l => l.entity_id === e.id);
      const own = data.owners.find(o => o.entity_id === e.id);
      return [e.nodx_uid, e.business_name, own?.name ?? '', loc?.municipality ?? ''];
    });
    const slide = ppt.addSlide();
    slide.addText('Territorial Atlas', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
    slide.addTable(combined, {
      x: 0.5, y: 1.2, w: 9, colW: [2, 3, 2, 2],
      fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B',
    });
  }

  private addOpportunitiesSlides(ppt: PptxGenJS, data: OpportunityExportData) {
    if (data.opportunities.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Expansion Opportunities', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.opportunities.slice(0, 10).map(o => [
          o.geo_name, o.opportunity_type, o.current_establishments.toString(),
          o.estimated_potential?.toString() ?? '',
        ]),
        { x: 0.5, y: 1.2, w: 9, colW: [3, 2, 2, 2], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
    if (data.gaps.length > 0) {
      const slide = ppt.addSlide();
      slide.addText('Gap Analysis', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
      slide.addTable(
        data.gaps.slice(0, 10).map(g => [
          g.geo_name, g.gap_type, g.current_value?.toString() ?? '', g.gap_pct ? `${(g.gap_pct * 100).toFixed(1)}%` : '',
        ]),
        { x: 0.5, y: 1.2, w: 9, colW: [3, 2, 2, 2], fontSize: 10, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B' }
      );
    }
  }

  private addGenericSlides(ppt: PptxGenJS, data: Record<string, unknown>[]) {
    const keys = Object.keys(data[0]);
    const rows = data.slice(0, 12).map(row => keys.map(k => String(row[k] ?? '')));
    const slide = ppt.addSlide();
    slide.addText('Data Export', { x: 0.5, y: 0.5, fontSize: 20, color: '1E3A8A', bold: true });
    slide.addTable(rows, {
      x: 0.5, y: 1.2, w: 9,
      fontSize: 9, border: { pt: 0.5, color: 'CBD5E1' }, color: '1E293B',
    });
  }

  // ============================================================
  // Type guards
  // ============================================================
  private isRegistryData(data: ExportData): data is RegistryExportData {
    return typeof data === 'object' && data !== null && 'entities' in data && Array.isArray((data as RegistryExportData).entities);
  }
  private isIntelligenceData(data: ExportData): data is IntelligenceExportData {
    return typeof data === 'object' && data !== null && 'coverage' in data && Array.isArray((data as IntelligenceExportData).coverage);
  }
  private isAtlasData(data: ExportData): data is AtlasExportData {
    return typeof data === 'object' && data !== null && 'assignments' in data && Array.isArray((data as AtlasExportData).assignments);
  }
  private isOpportunityData(data: ExportData): data is OpportunityExportData {
    return typeof data === 'object' && data !== null && 'potentialScores' in data && Array.isArray((data as OpportunityExportData).potentialScores);
  }

  // ============================================================
  // Unified export dispatcher
  // ============================================================
  async export(config: ExportConfig, data: ExportData): Promise<void> {
    switch (config.format) {
      case 'pdf':  return this.exportPDF(config, data);
      case 'xlsx': return this.exportExcel(config, data);
      case 'csv':  return this.exportCSV(config, data);
      case 'pptx': return this.exportPowerPoint(config, data);
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }
}

export const territorialExportEngine = new TerritorialExportEngine();
