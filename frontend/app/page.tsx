"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const FeatureCard = ({ icon, title, description, highlight }: {
  icon: string;
  title: string;
  description: string;
  highlight?: string;
}) => (
  <div className="card hover:transform hover:scale-[1.02] transition-all duration-200">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2 text-surface-contrast">{title}</h3>
    <p className="text-contrast-muted mb-3">{description}</p>
    {highlight && (
      <div className="text-sm font-medium text-gradient">{highlight}</div>
    )}
  </div>
);

const StatCard = ({ value, label, suffix = "" }: {
  value: string;
  label: string;
  suffix?: string;
}) => (
  <div className="card text-center">
    <div className="text-3xl font-bold text-gradient mb-2">{value}{suffix}</div>
    <div className="text-sm text-contrast-muted">{label}</div>
  </div>
);

export default function Home() {
  const [demoQuestion] = useState("Explain photosynthesis and its importance.");
  const [demoIdeal] = useState("Photosynthesis converts light energy into chemical energy, producing glucose and oxygen; it's vital for energy flow and atmospheric oxygen.");
  const [demoUserAnswer] = useState("Plants breathe in sunlight and make food; they also give air.");

  return (
    <div className="relative min-h-screen vignette bg-cool">
      {/* Animated background blobs */}
      <div className="absolute left-1/2 -translate-x-1/2 top-12 pointer-events-none">
        <div className="blob blob-1" style={{opacity:0.08}} />
        <div className="blob blob-2" style={{opacity:0.06, marginTop: -80}} />
        <div className="blob blob-3" style={{opacity:0.04, marginTop: -40}} />
      </div>

      {/* Navigation */}
      <nav className="relative px-6 py-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center text-white font-bold text-lg shadow-lg">
              📚
            </div>
            <div>
              <div className="text-xl font-bold text-gradient">LearnLens</div>
              <div className="text-sm text-contrast-muted">Smart Learning Analytics</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/app" className="btn btn-primary">
              Try Tool
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 sm:px-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-surface-contrast leading-tight">
              Unlock Student Potential with{" "}
              <span className="text-gradient">Smart Analytics</span>
            </h1>
            <p className="text-xl sm:text-2xl text-contrast-muted mb-8 leading-relaxed">
              Analyze student responses, predict misconceptions, and estimate question difficulty 
              using advanced NLP and Item Response Theory. Empower educators with intelligent insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/app" className="btn btn-primary text-lg px-8 py-4">
                Start Analyzing
              </Link>
              
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
            <StatCard value="95" label="Accuracy Rate" suffix="%" />
            <StatCard value="3" label="Core Features" />
            <StatCard value="∞" label="Questions Supported" />
            <StatCard value="AI" label="Powered Analysis" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-6 py-20 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-surface-contrast">
              Powerful Features for <span className="text-gradient">Modern Education</span>
            </h2>
            <p className="text-xl text-contrast-muted max-w-3xl mx-auto">
              Our AI-driven platform provides comprehensive analysis tools to help educators 
              understand student learning patterns and improve teaching effectiveness.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🎯"
              title="Smart Answer Analysis"
              description="Compare student responses against ideal answers using advanced semantic similarity algorithms. Get instant feedback on answer quality and completeness."
              highlight="Cosine Similarity & NLP"
            />
            <FeatureCard
              icon="🔍"
              title="Misconception Detection"
              description="Identify common student misconceptions automatically using machine learning models trained on educational data patterns."
              highlight="ML Classification"
            />
            <FeatureCard
              icon="📊"
              title="Difficulty Estimation"
              description="Predict question difficulty using Item Response Theory (IRT) to help educators create balanced assessments and learning paths."
              highlight="IRT Analysis"
            />
          </div>
        </div>
      </section>

      {/* Demo Preview Section */}
      <section className="relative px-6 py-20 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-surface-contrast">
              See It In <span className="text-gradient">Action</span>
            </h2>
            <p className="text-xl text-contrast-muted">
              Watch how our tool analyzes a real student response about photosynthesis
            </p>
          </div>

          <div className="bg-glass p-8 rounded-2xl border-gradient max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-contrast mb-2">Question</label>
                  <div className="p-3 bg-surface rounded-lg text-contrast-muted text-sm">
                    {demoQuestion}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-contrast mb-2">Student Answer</label>
                  <div className="p-3 bg-surface rounded-lg text-contrast-muted text-sm">
                    {demoUserAnswer}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="card">
                  <h4 className="font-medium text-surface-contrast mb-2">Analysis Results</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-contrast-muted">Similarity Score</span>
                      <span className="text-gradient font-medium">78%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-contrast-muted">Misconception Risk</span>
                      <span className="text-orange-400 font-medium">Medium</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-contrast-muted">Question Difficulty</span>
                      <span className="text-green-400 font-medium">Easy</span>
                    </div>
                  </div>
                </div>
                <Link href="/app" className="btn btn-primary w-full">
                  Try This Example
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative px-6 py-20 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-surface-contrast">
              Why Educators <span className="text-gradient">Love</span> Our Tool
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-2 text-surface-contrast">Instant Feedback</h3>
              <p className="text-contrast-muted text-sm">Get immediate analysis results without waiting. Process hundreds of responses in seconds.</p>
            </div>
            <div className="card">
              <div className="text-3xl mb-4">🎓</div>
              <h3 className="text-lg font-semibold mb-2 text-surface-contrast">Improved Learning</h3>
              <p className="text-contrast-muted text-sm">Help students overcome misconceptions and improve understanding through targeted guidance.</p>
            </div>
            <div className="card">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-2 text-surface-contrast">Data-Driven Insights</h3>
              <p className="text-contrast-muted text-sm">Make informed decisions about curriculum and teaching strategies based on real analytics.</p>
            </div>
            <div className="card">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2 text-surface-contrast">AI-Powered</h3>
              <p className="text-contrast-muted text-sm">Leverage cutting-edge AI models including sentence transformers and ML classifiers.</p>
            </div>
            <div className="card">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-lg font-semibold mb-2 text-surface-contrast">Subject Agnostic</h3>
              <p className="text-contrast-muted text-sm">Works across all subjects and educational levels from elementary to university.</p>
            </div>
            <div className="card">
              <div className="text-3xl mb-4">🔬</div>
              <h3 className="text-lg font-semibold mb-2 text-surface-contrast">Research-Based</h3>
              <p className="text-contrast-muted text-sm">Built on proven educational research and Item Response Theory methodologies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20 sm:px-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-glass p-12 rounded-2xl border-gradient">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-surface-contrast">
              Ready to Transform Your Teaching?
            </h2>
            <p className="text-xl text-contrast-muted mb-8">
              Join educators worldwide who are using AI to improve student outcomes. 
              Start analyzing responses in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app" className="btn btn-primary text-lg px-8 py-4">
                Start Free Analysis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-12 sm:px-10 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center text-white font-bold">
                  📚
                </div>
                <div className="text-lg font-bold text-surface-contrast">LearnLens</div>
              </div>
              <p className="text-contrast-muted text-sm mb-4">
                Advanced AI-powered educational assessment tool for analyzing student responses, 
                predicting misconceptions, and estimating question difficulty.
              </p>
              <div className="text-xs text-contrast-muted">
                Built with FastAPI, Next.js, and state-of-the-art ML models
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-surface-contrast mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-contrast-muted">
                <li>Answer Analysis</li>
                <li>Misconception Detection</li>
                <li>Difficulty Estimation</li>
                <li>Real-time Processing</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-surface-contrast mb-3">Technology</h4>
              <ul className="space-y-2 text-sm text-contrast-muted">
                <li>Machine Learning</li>
                <li>Natural Language Processing</li>
                <li>Item Response Theory</li>
                <li>Semantic Analysis</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-contrast-muted">
            © 2025 LearnLens.
          </div>
        </div>
      </footer>
    </div>
  );
}
