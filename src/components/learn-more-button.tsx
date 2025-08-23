"use client"

import { Button } from "@/components/ui/button"

export function LearnMoreButton() {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section')
    featuresSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <Button 
      variant="outline" 
      size="lg" 
      className="text-lg px-8"
      onClick={scrollToFeatures}
    >
      Learn More
    </Button>
  )
}
