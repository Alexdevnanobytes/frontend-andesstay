import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';
import { Unit } from './models';
import { SessionService } from './session.service';

@Component({selector: 'app-catalog', standalone: false, templateUrl: './catalog.component.html'})
export class CatalogComponent implements OnInit {
  units: Unit[] = [];
  availableUnits: Unit[] = [];
  error = '';
  message = '';
  editingId = '';
  from = '';
  to = '';
  form: {code: string; type: 'HABITACION' | 'CABANA'; description: string; nightlyRate: number} =
    {code: '', type: 'HABITACION', description: '', nightlyRate: 0};
  constructor(private readonly api: ApiService, public readonly session: SessionService) {}
  ngOnInit(): void { this.load(); }
  private fail(error: HttpErrorResponse): void { this.error = error.error?.detail || error.error?.error || `Error ${error.status || 'de conexión'}.`; }
  load(): void { this.api.units().subscribe({next: units => this.units = units, error: error => this.fail(error)}); }
  search(): void {
    if (!this.from || !this.to || this.from >= this.to) { this.error = 'Selecciona fechas válidas.'; return; }
    this.error = '';
    this.api.available(this.from, this.to).subscribe({next: units => this.availableUnits = units, error: error => this.fail(error)});
  }
  save(): void {
    this.error = ''; this.message = '';
    const action = this.editingId ? this.api.updateUnit(this.editingId, this.form) : this.api.createUnit(this.form);
    action.subscribe({next: () => { this.message = 'Unidad guardada.'; this.reset(); this.load(); }, error: error => this.fail(error)});
  }
  edit(unit: Unit): void {
    this.editingId = unit.id;
    this.form = {code: unit.code, type: unit.type, description: unit.description, nightlyRate: unit.nightlyRate};
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  reset(): void { this.editingId = ''; this.form = {code: '', type: 'HABITACION', description: '', nightlyRate: 0}; }
  remove(unit: Unit): void {
    if (!window.confirm(`¿Desactivar ${unit.code}?`)) return;
    this.api.deleteUnit(unit.id).subscribe({next: () => { this.message = 'Unidad desactivada.'; this.load(); }, error: error => this.fail(error)});
  }
}
