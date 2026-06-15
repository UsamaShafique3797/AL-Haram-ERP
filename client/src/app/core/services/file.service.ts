import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly api = `${environment.apiUrl}/files`;
  private http = inject(HttpClient);

  upload(file: File): Observable<{ path: string; fileName: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ path: string; fileName: string }>(`${this.api}/upload`, form);
  }

  fileUrl(path: string): string {
    return `${environment.apiUrl}/${path}`;
  }
}
