import React, { useState } from 'react';
import { Button } from './ui/Controls';

export const WelcomeOverlay = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to TekDetek 0.5",
      subtitle: "Demo Version",
      content: "You're among the first to experience this real-time video processing tool. Transform your webcam or video files into generative ASCII art with AI-powered detection.",
      showNext: true
    },
    {
      title: "Getting Started",
      content: "1. Click the INPUT node in the pipeline below\n2. Choose your source: webcam or upload a video file\n3. Click '+ ADD NODE' to build your processing chain\n\nBuild your pipeline by adding nodes from left to right.",
      showNext: true
    },
    {
      title: "AI Detect Node",
      content: "LUMA MODE (Default)\nDetects bright areas in your video and draws bounding boxes. Adjust threshold, grid size, and min cells to control sensitivity.\n\nOBJECTS MODE\nUses COCO-SSD for real-time object detection. More CPU intensive. Tip: Disable 'Show Boxes' in Luma settings to see only object detection results.\n\nFEATURES MODE\nPoseNet for human pose detection with skeleton visualization.",
      showNext: true
    },
    {
      title: "ASCII FX Node",
      content: "Converts your video feed into ASCII characters in real-time.\n\n• Multiple style presets: Classic, Dense, Blocks, Minimal, Binary\n• Custom character sets and color palettes\n• Adjustable grid density and font size\n• Pro tip: Enable 'Only In Boxes' to render ASCII only within detection areas",
      showNext: true
    },
    {
      title: "Overlay & Export",
      content: "OVERLAY NODE\nDraws connecting lines between detected objects. Customize curvature, color, and line width.\n\nEXPORT NODE\nRecord your creations:\n• MP4 video export (WebM format)\n• PNG sequence export (ZIP archive)\n\nReady to create? Let's go!",
      showNext: false
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-gray-500 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-500 bg-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-900 animate-pulse" />
            <h2 className="text-xl font-bold tracking-widest text-gray-900">
              {currentStep.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900 transition-colors p-1 font-bold"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div className="text-center mb-4">
              <p className="text-gray-900 text-sm mb-2 font-bold">{currentStep.subtitle}</p>
              <p className="text-gray-900 text-sm font-bold">{currentStep.content}</p>
            </div>
          )}
          
          {step > 0 && (
            <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-line font-bold">
              {currentStep.content}
            </div>
          )}

          {/* Step Indicators */}
          <div className="flex gap-2 justify-center mt-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'bg-gray-900 w-8' : 'bg-gray-400 w-1.5'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-gray-500 bg-gray-200 flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-3">
            <a
              href="https://buymeacoffee.com/vikmil"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded transition-colors border border-amber-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              BUY ME A COFFEE
            </a>
            <a
              href="https://instagram.com/iamviktor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded transition-colors border border-gray-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              INSTAGRAM
            </a>
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={() => setStep(step - 1)}
                className="w-auto"
              >
                BACK
              </Button>
            )}
            {currentStep.showNext ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="w-auto"
              >
                NEXT
              </Button>
            ) : (
              <Button
                onClick={onClose}
                className="w-auto"
              >
                GET STARTED
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

