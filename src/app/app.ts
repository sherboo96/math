import { Component, Inject, OnInit, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: 'app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('math');
  protected readonly preloadingPdfs = signal<boolean>(true);
  protected readonly downloadingPdf = signal<string | null>(null);
  
  // Cache for preloaded PDFs - stores Blob URLs
  private readonly pdfBlobUrls = new Map<string, string>(); // Store blob URLs for downloads
  private readonly pdfPaths = [
    'assets/pdf/tests.pdf',
    'assets/pdf/culclim.pdf',
    'assets/pdf/math.pdf',
    'assets/pdf/answers.pdf',
    'assets/pdf/map.pdf',
    'assets/pdf/annancement.pdf',
  ];

  constructor(
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
        
        // Hide loader after first file loads (lazy loading - files available as they load)
        if (!firstFileLoaded) {
          firstFileLoaded = true;
          setTimeout(() => {
            this.preloadingPdfs.set(false);
          }, 500);
        }
      } catch (error) {
        console.error(`Error loading PDF ${path}:`, error);
        
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


  async downloadPdf(path: string, title: string, event: Event): Promise<void> {
    // Prevent card click event
    event.stopPropagation();
    
    // Set downloading state
    this.downloadingPdf.set(path);
    
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
        
        // Store blob URL for future use
        this.pdfBlobUrls.set(path, url);
        
        const link = this.document.createElement('a');
        link.href = url;
        link.download = `${title}.pdf`;
        this.document.body.appendChild(link);
        link.click();
        this.document.body.removeChild(link);
      }
      
      // Small delay to show success state
      setTimeout(() => {
        this.downloadingPdf.set(null);
      }, 500);
    } catch (error) {
      console.error(`Error downloading PDF ${path}:`, error);
      // Fallback: direct download link
      const link = this.document.createElement('a');
      link.href = path;
      link.download = `${title}.pdf`;
      this.document.body.appendChild(link);
      link.click();
      this.document.body.removeChild(link);
      
      this.downloadingPdf.set(null);
    }
  }
}
