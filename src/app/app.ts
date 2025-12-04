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
  protected readonly preloadingPdfs = signal<boolean>(true);
  
  // Cache for preloaded PDFs - stores Blob URLs
  private readonly pdfCache = new Map<string, SafeResourceUrl>();
  private readonly pdfLoadedStatus = new Map<string, boolean>();
  private readonly pdfBlobUrls = new Map<string, string>(); // Store blob URLs to revoke later
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

  private async preloadPdfs(): Promise<void> {
    this.preloadingPdfs.set(true);
    const totalPdfs = this.pdfPaths.length;

    // Load all PDFs using fetch API to ensure they're cached in memory
    const loadPromises = this.pdfPaths.map(async (path) => {
      try {
        // Fetch the PDF file
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${path}`);
        }
        
        // Convert to Blob - this loads the file into memory
        const blob = await response.blob();
        
        // Create Blob URL - this creates a local URL pointing to the blob in memory
        const blobUrl = URL.createObjectURL(blob);
        this.pdfBlobUrls.set(path, blobUrl);
        
        // Create safe URL with PDF viewer parameters
        const pdfUrl = `${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
        
        // Store in cache - now the PDF is loaded in memory and ready to use
        this.pdfCache.set(path, safeUrl);
        this.pdfLoadedStatus.set(path, true);
      } catch (error) {
        console.error(`Error loading PDF ${path}:`, error);
        // Fallback: use original URL if fetch fails
        const pdfUrl = `${path}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
        this.pdfCache.set(path, safeUrl);
        this.pdfLoadedStatus.set(path, true);
      }
    });

    // Wait for all PDFs to load
    await Promise.allSettled(loadPromises);
    
    // All PDFs are now loaded in memory, hide loader
    setTimeout(() => {
      this.preloadingPdfs.set(false);
    }, 300);
    
    // Fallback: hide loader after max 10 seconds even if some failed
    setTimeout(() => {
      if (this.preloadingPdfs()) {
        this.preloadingPdfs.set(false);
      }
    }, 10000);
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
    
    // Always use cached PDF from Blob URL - it's already loaded in memory
    const cachedUrl = this.pdfCache.get(path);
    if (cachedUrl) {
      // PDF is already loaded as Blob, use it directly - no need to reload
      this.safePdfUrl.set(cachedUrl);
      this.pdfLoading.set(false); // Already loaded in memory, instant display
    } else {
      // Fallback: if not in cache yet, show loader and wait
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
