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
  protected readonly downloadingPdf = signal<string | null>(null);
  protected readonly selectedPdf = signal<string | null>(null);
  protected readonly selectedPdfTitle = signal<string | null>(null);
  protected readonly safePreviewUrl = signal<SafeResourceUrl | null>(null);
  protected readonly previewLoading = signal<boolean>(true);
  
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
      this.selectedPdf.set(fileId);
      this.selectedPdfTitle.set(title);
      this.previewLoading.set(true);
      
      // Create safe preview URL for iframe
      const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl));
      
      // Lock body scroll
      this.document.body.style.overflow = 'hidden';
    }
  }

  closePreview(): void {
    this.selectedPdf.set(null);
    this.selectedPdfTitle.set(null);
    this.safePreviewUrl.set(null);
    this.previewLoading.set(false);
    // Restore body scroll
    this.document.body.style.overflow = '';
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
