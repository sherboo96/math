import { Component, Inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
  protected readonly pdfLoading = signal<boolean>(false);

  constructor(
    private readonly sanitizer: DomSanitizer,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  private toggleBodyScroll(locked: boolean): void {
    this.document.body.style.overflow = locked ? 'hidden' : '';
  }

  openPdf(path: string): void {
    this.selectedPdf.set(path);
    this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(path));
    this.pdfLoading.set(true);
    this.toggleBodyScroll(true);
  }

  closePdf(): void {
    this.selectedPdf.set(null);
    this.safePdfUrl.set(null);
    this.pdfLoading.set(false);
    this.toggleBodyScroll(false);
  }

  onPdfLoaded(): void {
    this.pdfLoading.set(false);
  }
}
