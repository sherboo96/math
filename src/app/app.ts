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
  protected readonly selectedPdfTitle = signal<string | null>(null);
  protected readonly safePdfUrl = signal<SafeResourceUrl | null>(null);
  protected readonly pdfLoading = signal<boolean>(false);

  constructor(
    private readonly sanitizer: DomSanitizer,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  private toggleBodyScroll(locked: boolean): void {
    if (locked) {
      this.document.body.style.overflow = 'hidden';
      this.document.body.classList.add('modal-open');
    } else {
      this.document.body.style.overflow = '';
      this.document.body.classList.remove('modal-open');
    }
  }

  openPdf(path: string, title: string): void {
    this.selectedPdf.set(path);
    this.selectedPdfTitle.set(title);
    // Add PDF viewer parameters optimized for mobile devices
    // view=FitH: fit horizontally, zoom=page-width: better mobile viewing
    const pdfUrl = `${path}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
    this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl));
    this.pdfLoading.set(true);
    this.toggleBodyScroll(true);
    
    // Prevent iOS bounce scrolling - handled by CSS class
  }

  closePdf(): void {
    this.selectedPdf.set(null);
    this.selectedPdfTitle.set(null);
    this.safePdfUrl.set(null);
    this.pdfLoading.set(false);
    this.toggleBodyScroll(false);
    
    // Body position restored by removing modal-open class
  }

  onPdfLoaded(): void {
    this.pdfLoading.set(false);
  }
}
