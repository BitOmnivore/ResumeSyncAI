import { BarChart3, Target, Lightbulb, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AnalysisData } from "@/pages/Index";

interface AnalysisResultsProps {
  data: AnalysisData;
  onNewAnalysis: () => void;
}

export const AnalysisResults = ({ data, onNewAnalysis }: AnalysisResultsProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const statusToBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("strong")) return "✅ Strong Match";
    if (s.includes("partial")) return "⚠️ Partial Match";
    if (s.includes("missing") || s.includes("no")) return "❌ Missing";
    return "Match";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onNewAnalysis}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          New Analysis
        </Button>
      </div>

      {/* 1. ATS Score */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BarChart3 className="h-6 w-6 text-accent" />
            ATS Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className={`text-4xl font-extrabold ${getScoreColor(data.ATS_Score.value)}`}>{data.ATS_Score.value} / 100</div>
            </div>
          </div>
          <Progress value={data.ATS_Score.value} className="h-3" />
          <p className="text-sm text-muted-foreground">Reason: {data.ATS_Score.reason}</p>
        </CardContent>
      </Card>

      {/* 2. Resume-to-JD Match Percentage */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-6 w-6 text-primary" />
            Resume-to-JD Match Percentage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{data.Resume_to_JD_Match.percentage}% Match</span>
          </div>
          <Progress value={data.Resume_to_JD_Match.percentage} className="h-3" />
        </CardContent>
      </Card>

      {/* 3. Detailed Match Analysis */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-6 w-6 text-primary" />
            Detailed Match Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Job Description Requirement</th>
                  <th className="py-2 pr-4">Resume Evidence & Analysis</th>
                  <th className="py-2">Match Status</th>
                </tr>
              </thead>
              <tbody>
                {data.Resume_to_JD_Match.comparison_table.map((row, idx) => {
                  const statusText = statusToBadge(row.Match_Status);
                  return (
                    <tr key={idx} className="border-t">
                      <td className="py-3 pr-4 align-top font-medium">{row.Job_Requirement}</td>
                      <td className="py-3 pr-4 align-top">{row.Resume_Evidence}</td>
                      <td className="py-3 align-top">{statusText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. ATS Knockout Factors */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BarChart3 className="h-6 w-6 text-accent" />
            Knockout Factors Affecting ATS Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.ATS_Knockout_Factors.map((factor, idx) => (
              <Badge key={idx} className="bg-red-100 text-red-800">❌ {factor}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5. Strengths of Resume */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            Resume Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.Strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>✅</span>
                <span className="text-sm">{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 6. Conclusion */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-accent" />
            Conclusion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{data.Conclusion}</p>
        </CardContent>
      </Card>

      {/* 7. Actionable Recommendations */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            How to Improve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {data.Recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* 8. Overall Summary */}
      <Card className="border-2 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <span className="text-2xl">✨</span>
            Final AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-lg bg-card border-2 border-primary/20">
            <p className="text-base leading-relaxed">{data.Overall_Summary}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
