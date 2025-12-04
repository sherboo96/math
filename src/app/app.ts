import { Component, Inject, signal, ViewChild, ElementRef } from '@angular/core';
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
  protected readonly downloadingPdf = signal<string | null>(null);
  protected readonly selectedPdf = signal<string | null>(null);
  protected readonly selectedPdfTitle = signal<string | null>(null);
  protected readonly safePreviewUrl = signal<SafeResourceUrl | null>(null);
  protected readonly previewLoading = signal<boolean>(true);
  
  // Store scroll position before opening modal
  private scrollPosition = 0;
  
  // Reference to iframe element
  @ViewChild('pdfIframe', { static: false }) pdfIframe?: ElementRef<HTMLIFrameElement>;
  
  // Google Drive file IDs
  private readonly googleDriveFiles = new Map<string, string>([
    ['annancement', '1l4YggnpEzepaCRrNwcjXB8CkZTum9lu-'],
    ['answers', '10W2yQ8shlaoChP4-5EWNDwstCYDQ_bCf'],
    ['culclim', '10XDkKyjGBWe6bHDl_fwSKbPIZzJJPnA4'],
    ['map', '1qfEqVK2FOOQJm1cPshtaDPFhk0_jTSDc'],
    ['math', '1E87Vid6ebrXvHrEBIESlpTkZTRLJJYS5'],
    ['tests', '1W2aPN-bKpfbdJdmVLj1s1iLTrxn-crUq'],
  ]);

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly sanitizer: DomSanitizer,
  ) {}

  openPreview(fileKey: string, title: string, event: Event): void {
    // Prevent card click event
    event.stopPropagation();
    
    const fileId = this.googleDriveFiles.get(fileKey);
    if (fileId) {
      // Save current scroll position before any changes
      this.scrollPosition = window.pageYOffset || this.document.documentElement.scrollTop || 0;
      
      // Set PDF data first
      this.selectedPdf.set(fileId);
      this.selectedPdfTitle.set(title);
      this.previewLoading.set(true);
      
      // Create safe preview URL for iframe
      const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl));
      
      // Lock body scroll - use setTimeout to prevent blocking
      setTimeout(() => {
        this.document.body.classList.add('modal-open');
        this.document.body.style.overflow = 'hidden';
        
        // Only apply fixed positioning on mobile
        if (window.innerWidth <= 768) {
          this.document.body.style.position = 'fixed';
          this.document.body.style.width = '100%';
          this.document.body.style.top = `-${this.scrollPosition}px`;
          this.document.body.style.left = '0';
        }
      }, 0);
    }
  }

  closePreview(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Kill Google Drive session by clearing iframe src
    this.killDriveSession();
    
    // Clear PDF data first
    this.selectedPdf.set(null);
    this.selectedPdfTitle.set(null);
    this.safePreviewUrl.set(null);
    this.previewLoading.set(false);
    
    // Restore body scroll - use setTimeout to prevent blocking
    setTimeout(() => {
      // Remove modal class first
      this.document.body.classList.remove('modal-open');
      
      // Clear all inline styles
      this.document.body.style.overflow = '';
      this.document.body.style.position = '';
      this.document.body.style.width = '';
      this.document.body.style.top = '';
      this.document.body.style.height = '';
      this.document.body.style.left = '';
      this.document.body.style.right = '';
      this.document.body.style.bottom = '';
      
      // Restore scroll position after styles are cleared
      setTimeout(() => {
        if (this.scrollPosition > 0) {
          window.scrollTo({
            top: this.scrollPosition,
            behavior: 'auto'
          });
        }
        this.scrollPosition = 0;
      }, 50);
    }, 0);
  }

  private killDriveSession(): void {
    // Find and clear all iframes in the modal
    const iframes = this.document.querySelectorAll('iframe[src*="drive.google.com"]');
    iframes.forEach((iframe) => {
      const htmlIframe = iframe as HTMLIFrameElement;
      // Clear src to stop loading and kill session
      htmlIframe.src = 'about:blank';
      // Remove iframe from DOM
      htmlIframe.remove();
    });
    
    // Also try to access via ViewChild if available
    if (this.pdfIframe?.nativeElement) {
      try {
        this.pdfIframe.nativeElement.src = 'about:blank';
        // Clear content
        const iframeDoc = this.pdfIframe.nativeElement.contentDocument || 
                         this.pdfIframe.nativeElement.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write('');
          iframeDoc.close();
        }
      } catch (e) {
        // Cross-origin restrictions may prevent access
        // Just clearing src is enough
      }
    }
    
    // Force garbage collection hint (if available in dev tools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch (e) {
        // Ignore if not available
      }
    }
  }

  onPreviewLoaded(): void {
    this.previewLoading.set(false);
  }

  downloadPdf(fileKey: string, title: string, event: Event): void {
    // Prevent card click event
    event.stopPropagation();
    
    // Set downloading state
    this.downloadingPdf.set(fileKey);
    
    try {
      const fileId = this.googleDriveFiles.get(fileKey);
      if (!fileId) {
        throw new Error(`File ID not found for ${fileKey}`);
      }
      
      // Create Google Drive direct download link
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      // Open download link in new tab
      const link = this.document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      this.document.body.appendChild(link);
      link.click();
      this.document.body.removeChild(link);
      
      // Reset downloading state after delay
      setTimeout(() => {
        this.downloadingPdf.set(null);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF ${fileKey}:`, error);
      this.downloadingPdf.set(null);
    }
  }
}
