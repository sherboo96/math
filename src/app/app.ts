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
    let firstFileLoaded = false;

    // Load PDFs in parallel - each file becomes available as soon as it loads (lazy loading)
    this.pdfPaths.forEach(async (path) => {
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
        
        // Store in cache - PDF is now available immediately for use
        this.pdfCache.set(path, safeUrl);
        this.pdfLoadedStatus.set(path, true);
        
        // Hide loader after first file loads (lazy loading - files available as they load)
        if (!firstFileLoaded) {
          firstFileLoaded = true;
          setTimeout(() => {
            this.preloadingPdfs.set(false);
          }, 500);
        }
      } catch (error) {
        console.error(`Error loading PDF ${path}:`, error);
        // Fallback: use original URL if fetch fails
        const pdfUrl = `${path}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
        this.pdfCache.set(path, safeUrl);
        this.pdfLoadedStatus.set(path, true);
        
        // Hide loader if this is the first file (even if it failed)
        if (!firstFileLoaded) {
          firstFileLoaded = true;
          setTimeout(() => {
            this.preloadingPdfs.set(false);
          }, 500);
        }
      }
    });
    
    // Fallback: hide loader after max 3 seconds even if no files loaded yet
    setTimeout(() => {
      if (this.preloadingPdfs()) {
        this.preloadingPdfs.set(false);
      }
    }, 3000);
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
    
    // Check if PDF is already loaded in cache
    const cachedUrl = this.pdfCache.get(path);
    const isLoaded = this.pdfLoadedStatus.get(path);
    
    if (cachedUrl && isLoaded) {
      // PDF is already loaded as Blob in memory, use it directly - instant display
      this.safePdfUrl.set(cachedUrl);
      this.pdfLoading.set(false);
    } else if (cachedUrl) {
      // PDF URL is cached but still loading, use it and show loader briefly
      this.safePdfUrl.set(cachedUrl);
      this.pdfLoading.set(true);
    } else {
      // PDF not in cache yet - load it on demand (lazy load)
      this.loadPdfOnDemand(path);
    }
    
    this.toggleBodyScroll(true);
  }

  private async loadPdfOnDemand(path: string): Promise<void> {
    this.pdfLoading.set(true);
    
    try {
      // Fetch the PDF file
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
      }
      
      // Convert to Blob
      const blob = await response.blob();
      
      // Create Blob URL
      const blobUrl = URL.createObjectURL(blob);
      this.pdfBlobUrls.set(path, blobUrl);
      
      // Create safe URL with PDF viewer parameters
      const pdfUrl = `${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
      
      // Store in cache
      this.pdfCache.set(path, safeUrl);
      this.pdfLoadedStatus.set(path, true);
      this.safePdfUrl.set(safeUrl);
    } catch (error) {
      console.error(`Error loading PDF ${path}:`, error);
      // Fallback: use original URL
      const pdfUrl = `${path}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`;
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
      this.pdfCache.set(path, safeUrl);
      this.pdfLoadedStatus.set(path, true);
      this.safePdfUrl.set(safeUrl);
    }
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

  async downloadPdf(path: string, title: string, event: Event): Promise<void> {
    // Prevent card click event
    event.stopPropagation();
    
    try {
      // Check if PDF is already loaded in cache
      const blobUrl = this.pdfBlobUrls.get(path);
      
      if (blobUrl) {
        // PDF is already loaded, download directly from Blob
        const link = this.document.createElement('a');
        link.href = blobUrl;
        link.download = `${title}.pdf`;
        this.document.body.appendChild(link);
        link.click();
        this.document.body.removeChild(link);
      } else {
        // PDF not loaded yet, fetch and download
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${path}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = this.document.createElement('a');
        link.href = url;
        link.download = `${title}.pdf`;
        this.document.body.appendChild(link);
        link.click();
        this.document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error(`Error downloading PDF ${path}:`, error);
      // Fallback: direct download link
      const link = this.document.createElement('a');
      link.href = path;
      link.download = `${title}.pdf`;
      this.document.body.appendChild(link);
      link.click();
      this.document.body.removeChild(link);
    }
  }
}
