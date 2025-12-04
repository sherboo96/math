import { Component, Inject, OnInit, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: 'app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('math');
  protected readonly selectedPdf = signal<string | null>(null);
  protected readonly selectedPdfTitle = signal<string | null>(null);
  protected readonly safePdfUrl = signal<SafeResourceUrl | null>(null);
  protected readonly pdfLoading = signal<boolean>(false);
  
  // Cache for preloaded PDFs
  private readonly pdfCache = new Map<string, SafeResourceUrl>();
  private readonly pdfPaths = [
    'assets/pdf/tests.pdf',
    'assets/pdf/culclim.pdf',
    'assets/pdf/math.pdf',
    'assets/pdf/answers.pdf',
    'assets/pdf/map.pdf',
    'assets/pdf/annancement.pdf',
  ];

  constructor(
    private readonly sanitizer: DomSanitizer,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  ngOnInit(): void {
    // Preload all PDFs when component initializes
    this.preloadPdfs();
  }

  private preloadPdfs(): void {
    this.pdfPaths.forEach((path) => {
      const pdfUrl = `${path}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
      this.pdfCache.set(path, safeUrl);
      
      // Preload the PDF file in the background
      const link = this.document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = path;
      this.document.head.appendChild(link);
    });
  }

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
    
    // Use cached PDF if available, otherwise create new one
    const cachedUrl = this.pdfCache.get(path);
    if (cachedUrl) {
      this.safePdfUrl.set(cachedUrl);
      this.pdfLoading.set(false); // Already loaded, no need to show loader
    } else {
      // Fallback: create new URL if not in cache
      const pdfUrl = `${path}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
      this.pdfCache.set(path, safeUrl);
      this.safePdfUrl.set(safeUrl);
      this.pdfLoading.set(true);
    }
    
    this.toggleBodyScroll(true);
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
