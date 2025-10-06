import { useState } from "react";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ResumeUploadProps {
  onFileSelect: (file: File) => void;
  onTextExtract: (text: string) => void;
}

export const ResumeUpload = ({ onFileSelect, onTextExtract }: ResumeUploadProps) => {
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOCX, or TXT file.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);
    onFileSelect(file);

    try {
      // For text files, read directly
      if (file.type === 'text/plain') {
        const text = await file.text();
        onTextExtract(text);
        toast({
          title: "Resume Uploaded",
          description: "Text extracted successfully!",
        });
      } else if (file.type === 'application/pdf') {
        // Attempt client-side PDF text extraction using globally loaded pdf.js
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib || !pdfjsLib.getDocument) {
            throw new Error('pdf.js not loaded');
          }

          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let extractedText = '';
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => (item && 'str' in item ? (item as any).str : '')).filter(Boolean);
            extractedText += strings.join(' ') + '\n';
          }

          const cleaned = extractedText.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned.length > 0) {
            onTextExtract(cleaned);
            toast({
              title: "Resume Uploaded",
              description: "PDF text extracted successfully!",
            });
          } else {
            toast({
              title: "Could not extract text",
              description: "This PDF may be scanned or image-based. Please paste text manually.",
              variant: "destructive",
            });
          }
        } catch (pdfErr) {
          console.error('PDF extraction error:', pdfErr);
          toast({
            title: "PDF Extraction Failed",
            description: "Please paste your resume text or upload a TXT/DOCX.",
            variant: "destructive",
          });
        }
      } else {
        // For DOC/DOCX, we currently don't parse client-side; proceed without extraction
        toast({
          title: "Resume Uploaded",
          description: `${file.name} ready for analysis. If analysis fails, paste text manually.`,
        });
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer relative overflow-hidden group">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="space-y-4">
          {!fileName ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, DOCX, or TXT (max 10MB)
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  {fileName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isProcessing ? "Processing..." : "File uploaded successfully"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {fileName && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFileName("");
            onFileSelect(null as any);
            onTextExtract("");
          }}
          className="w-full"
        >
          Clear and upload a different file
        </Button>
      )}
    </div>
  );
};
