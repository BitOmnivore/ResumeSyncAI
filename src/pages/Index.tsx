import { useState } from "react";
import { Upload, FileText, BarChart3, Target, TrendingUp } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ResumeUpload } from "@/components/ResumeUpload";
import { AnalysisResults } from "@/components/AnalysisResults";

export interface AnalysisData {
  ATS_Score: {
    value: number;
    reason: string;
  };
  Resume_to_JD_Match: {
    percentage: number;
    comparison_table: Array<{
      Job_Requirement: string;
      Resume_Evidence: string;
      Match_Status: string;
    }>;
  };
  ATS_Knockout_Factors: string[];
  Strengths: string[];
  Conclusion: string;
  Recommendations: string[];
  Overall_Summary: string;
}

const Index = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisData | null>(null);

  const handleJobDescriptionChange = (value: string) => {
    setJobDescription(value);
  };

  const handleAnalyze = async () => {
    if (!resumeText || resumeText.trim().length === 0) {
      toast({
        title: "Missing Resume Text",
        description: "Please paste resume text or ensure PDF text extraction succeeded.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription || jobDescription.trim().length === 0) {
      toast({
        title: "Missing Job Description",
        description: "Please provide at least one job description.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
      if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not set");

      const systemPrompt = `You are an AI simulating a modern Applicant Tracking System (ATS). 
Your task is to evaluate how well a candidate’s resume (plain text from PDF) matches a given job description.

Return an **ATS Optimization Score (0–100)**, **Resume-to-JD Match Percentage (0–100)**, and other descriptive outputs as described below.

---

### Rigid / Knockout Factors (must strictly apply):

1. **CGPA**
   - If the resume CGPA is below the JD requirement, reduce ATS score significantly (>= 20 points reduction for 0.5 below requirement).  
2. **Graduation Year**
   - If the resume graduation year is later than the JD requirement, reduce ATS score significantly.  
3. **Degree / Mandatory Certifications**
   - Must meet JD requirement; otherwise, consider it a knockout and reduce score heavily.

### Flexible Factors (minor adjustments):

- Keywords (skills, technologies, job title relevance)  
- Experience relevance (projects, internships)  
- Achievements (measurable outcomes)  
- Resume structure & formatting  

### Reasoning

- Clearly mention which knockout factors affected the score.  
- Explain other flexible factors briefly.  

---

### JSON Output Format

Return ONLY JSON:

{
  "ATS_Score": {"value": <number 0-100>, "reason": "<one-sentence reason>"},
  "Resume_to_JD_Match": {
    "percentage": <number 0-100>,
    "comparison_table": [{"Job_Requirement": "...", "Resume_Evidence": "...", "Match_Status": "Strong Match|Match|Partial Match|Missing"}]
  },
  "ATS_Knockout_Factors": ["<string>", ...],
  "Strengths": ["<string>", ...],
  "Conclusion": "<string>",
  "Recommendations": ["<string>", ...],
  "Overall_Summary": "<string>"
}`;

      const userPrompt = `Analyze this resume against the provided job description.

Resume:
${resumeText.trim()}

Job Description:
${jobDescription}

Return the JSON and text outputs exactly as specified in the system prompt.`;

      // --- Call 1: Numeric outputs (ATS Score & Resume-to-JD Match) ---
      const numericResp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0 }, // deterministic for numeric
          }),
        }
      );

      if (!numericResp.ok) throw new Error(`Gemini error ${numericResp.status}`);
      const numericData = await numericResp.json();
      const numericText = numericData?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (!numericText) throw new Error("No numeric content from Gemini");

      // Allow for fenced JSON or raw JSON
      const fenced1 = numericText.match(/```json\s*([\s\S]*?)\s*```/) || numericText.match(/```\s*([\s\S]*?)\s*```/);
      const numericJson = JSON.parse((fenced1 ? fenced1[1] : numericText).trim());

      // --- Call 2: Descriptive outputs ---
      const descriptiveResp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.6 }, // flexible for descriptive
          }),
        }
      );

      if (!descriptiveResp.ok) throw new Error(`Gemini error ${descriptiveResp.status}`);
      const descriptiveData = await descriptiveResp.json();
      const descriptiveText = descriptiveData?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (!descriptiveText) throw new Error("No descriptive content from Gemini");

      // --- Merge results ---
      const knockoutFactors = Array.isArray(numericJson.ATS_Knockout_Factors) && numericJson.ATS_Knockout_Factors.length > 0
        ? numericJson.ATS_Knockout_Factors
        : ["All Clear 🚀"];

      setAnalysisResults({
        ATS_Score: numericJson.ATS_Score,
        Resume_to_JD_Match: numericJson.Resume_to_JD_Match,
        ATS_Knockout_Factors: knockoutFactors,
        Strengths: numericJson.Strengths || [],
        Conclusion: numericJson.Conclusion || "",
        Recommendations: numericJson.Recommendations || [],
        Overall_Summary: numericJson.Overall_Summary || "",
      });

      toast({
        title: "Analysis Complete!",
        description: "Your resume has been analyzed successfully.",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An error occurred during analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.ico" alt="logo" className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  ResumeSyncAI
                </h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {!analysisResults ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-8">
              <h2 className="text-4xl font-bold tracking-tight">
                Optimize Your Resume with AI
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Get instant feedback on ATS compatibility, match scores, skill gaps, and professional summaries
              </p>
            </div>

            {/* About */}
            <div className="grid grid-cols-1">
              <Card className="border-2 hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold text-xl">About ResumeSyncAI</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    ResumeSyncAI helps you tailor your resume to any job description using AI. It analyzes ATS
                    compatibility, highlights matching keywords, identifies gaps, and generates an actionable plan to
                    improve your chances of passing automated screenings. Upload a resume or paste text, add a job
                    description, and get instant insights with a clean, shareable breakdown.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="border-2 hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6 text-center space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Match Analysis</h3>
                  <p className="text-sm text-muted-foreground">Get detailed match percentages for each job description</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6 text-center space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold">ATS Score</h3>
                  <p className="text-sm text-muted-foreground">Optimize for applicant tracking systems</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6 text-center space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Skill Insights</h3>
                  <p className="text-sm text-muted-foreground">Discover skill gaps and recommendations</p>
                </CardContent>
              </Card>
            </div>

            {/* Resume Upload */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Upload Your Resume
                </CardTitle>
                <CardDescription>
                  Upload your resume (PDF, DOCX, or TXT) or paste the text below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResumeUpload 
                  onFileSelect={setResumeFile} 
                  onTextExtract={setResumeText}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Or paste resume text:</label>
                  <Textarea
                    placeholder="Paste your resume text here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Descriptions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-accent" />
                  Job Descriptions
                </CardTitle>
                <CardDescription>
                  Add a job description to compare against your resume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Job Description (Required)
                  </label>
                  <Textarea
                    placeholder={`Paste job description here...`}
                    value={jobDescription}
                    onChange={(e) => handleJobDescriptionChange(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Analyze Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <img src="/favicon.ico" alt="logo" className="mr-2 h-5 w-5" />
                    Analyze Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <AnalysisResults 
            data={analysisResults} 
            onNewAnalysis={() => setAnalysisResults(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-semibold">ResumeSyncAI</p>
            <p className="text-xs text-muted-foreground">by The Saffron Coder</p>
            <p className="text-xs text-muted-foreground mt-2">
              © 2025 ResumeSyncAI — Built with 🧡 by The Saffron Coder
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
