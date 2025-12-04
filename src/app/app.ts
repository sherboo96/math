import { Component, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: 'app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('math');
  protected readonly selectedPdf = signal<string | null>(null);
  protected readonly safePdfUrl = signal<SafeResourceUrl | null>(null);

  constructor(private readonly sanitizer: DomSanitizer) {}

  openPdf(path: string): void {
    this.selectedPdf.set(path);
    this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(path));
  }

  closePdf(): void {
    this.selectedPdf.set(null);
    this.safePdfUrl.set(null);
  }
}
