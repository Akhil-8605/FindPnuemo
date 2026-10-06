import React, { useState, useEffect } from 'react';
import { AnalysisData, ScanPresetId } from './types';
import {
  LOBAR_PNEUMONIA_CASE,
  INTERSTITIAL_CASE,
  NORMAL_CASE,
  createAnalysisForUpload,
} from './data/sampleScans';
import { analyzeChestXRay, loadPresetAnalysis } from './utils/apiClient';
import { Navbar, AppRoute } from './components/Navbar';
import { Footer } from './components/Footer';
import { CinematicTransition } from './components/CinematicTransition';
import { LandingView } from './views/LandingView';
import { ResultsView } from './views/ResultsView';
import { XrayInspectionView } from './views/XrayInspectionView';
import { ModelHealthView } from './views/ModelHealthView';
import { ApiDocsView } from './views/ApiDocsView';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/results/x-ray-inspection') return '/results/x-ray-inspection';
      if (path === '/results') return '/results';
      if (path === '/lowiqbots/health') return '/lowiqbots/health';
      if (path === '/lowiqbots/api-docs') return '/lowiqbots/api-docs';
    }
    return '/';
  });

  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisData>(LOBAR_PNEUMONIA_CASE);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);

  // Connect to DL model on mount and load authentic reference analysis
  useEffect(() => {
    loadPresetAnalysis('lobar_pneumonia')
      .then((realData) => {
        setCurrentAnalysis(realData);
      })
      .catch((err) => {
        console.warn('[FindPneumo] Initial DL model load warning (will retry on user action):', err);
      });
  }, []);

  // Sync browser back/forward buttons with state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/results/x-ray-inspection') {
        setCurrentRoute('/results/x-ray-inspection');
      } else if (path === '/results') {
        setCurrentRoute('/results');
      } else if (path === '/lowiqbots/health') {
        setCurrentRoute('/lowiqbots/health');
      } else if (path === '/lowiqbots/api-docs') {
        setCurrentRoute('/lowiqbots/api-docs');
      } else {
        setCurrentRoute('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', route);
      } catch (e) {
        // Safe fallback for restricted environments
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectPresetAndAnalyze = async (presetId: ScanPresetId) => {
    setIsTransitioning(true);
    setIsModelLoading(true);

    try {
      const realAnalysis = await loadPresetAnalysis(presetId);
      setCurrentAnalysis(realAnalysis);
    } catch (err) {
      console.error('Failed to load preset analysis from DL server:', err);
      // Safe fallback if server is briefly offline
      if (presetId === 'lobar_pneumonia') {
        setCurrentAnalysis(LOBAR_PNEUMONIA_CASE);
      } else if (presetId === 'interstitial_pattern') {
        setCurrentAnalysis(INTERSTITIAL_CASE);
      } else if (presetId === 'clear_lungs') {
        setCurrentAnalysis(NORMAL_CASE);
      }
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleUploadCustomFileAndAnalyze = (file: File) => {
    // Read file immediately to display in scanning viewport while neural inference runs
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      if (dataUri) {
        // Show scan immediately in canvas during scanning animation
        setCurrentAnalysis((prev) => ({
          ...prev,
          customImageUri: dataUri,
          patientRef: `User File: ${file.name}`,
          caseName: `Patient Scan: ${file.name.replace(/\.[^/.]+$/, '')}`,
        }));

        setIsTransitioning(true);
        setIsModelLoading(true);

        try {
          // Send file directly to DenseNet-121 inference engine
          const realAnalysis = await analyzeChestXRay(file, file.name);
          setCurrentAnalysis(realAnalysis);
        } catch (err) {
          console.error('[FindPneumo] Neural inference upload error:', err);
          // Fallback creation if server is unreachable
          const uploadFallback = createAnalysisForUpload(dataUri, file.name);
          setCurrentAnalysis(uploadFallback);
        } finally {
          setIsModelLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async () => {
    setIsTransitioning(true);
    setIsModelLoading(true);

    try {
      const realAnalysis = await loadPresetAnalysis('lobar_pneumonia');
      setCurrentAnalysis(realAnalysis);
    } catch (err) {
      console.error(err);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleTransitionComplete = () => {
    setIsTransitioning(false);
    navigateTo('/results');
  };

  // If on full-screen inspection tour, render full-screen view without navbar/footer clutter
  if (currentRoute === '/results/x-ray-inspection') {
    return (
      <XrayInspectionView
        analysis={currentAnalysis}
        onNavigateBack={() => navigateTo('/results')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F0] text-black">
      {/* 3-Zone Top Navigation Bar */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={(route) => navigateTo(route)}
        onStartNewScan={() => {
          if (currentRoute === '/results') {
            navigateTo('/');
          } else {
            handleStartAnalysis();
          }
        }}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentRoute === '/' && (
          <LandingView
            currentAnalysis={currentAnalysis}
            onSelectPresetAndAnalyze={handleSelectPresetAndAnalyze}
            onUploadCustomFileAndAnalyze={handleUploadCustomFileAndAnalyze}
            onStartAnalysis={handleStartAnalysis}
          />
        )}

        {currentRoute === '/results' && (
          <ResultsView
            analysis={currentAnalysis}
            onStartNewScan={() => navigateTo('/')}
            onNavigateToFullscreenInspection={() => navigateTo('/results/x-ray-inspection')}
          />
        )}

        {currentRoute === '/lowiqbots/health' && (
          <ModelHealthView onNavigate={navigateTo} />
        )}

        {currentRoute === '/lowiqbots/api-docs' && (
          <ApiDocsView onNavigate={navigateTo} />
        )}
      </main>

      {/* Full-Screen High-Voltage Cinematic Scan Transition */}
      {isTransitioning && (
        <CinematicTransition
          analysis={currentAnalysis}
          isLoading={isModelLoading}
          onComplete={handleTransitionComplete}
        />
      )}

      {/* Brutalist Footer */}
      <Footer onNavigate={(route) => navigateTo(route)} />
    </div>
  );
}
