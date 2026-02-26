const quotes = [
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
  { text: "A penny saved is a penny earned.", author: "Benjamin Franklin" },
  { text: "It's not about how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
  { text: "The habit of saving is itself an education.", author: "T.T. Munger" },
  { text: "Small steps every day lead to big results over time.", author: "Unknown" },
  { text: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
  { text: "Wealth is not about having a lot of money; it's about having a lot of options.", author: "Chris Rock" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Every dollar you save is a vote for your future self.", author: "Unknown" },
  { text: "Rich people plan for three generations. Poor people plan for Saturday night.", author: "Gloria Steinem" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "You must gain control over your money or the lack of it will forever control you.", author: "Dave Ramsey" },
  { text: "Money grows on the tree of persistence.", author: "Japanese Proverb" },
  { text: "The best time to start saving was yesterday. The second best time is today.", author: "Unknown" },
  { text: "Frugality includes all the other virtues.", author: "Cicero" },
  { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
  { text: "Ninety percent of all millionaires become so through owning real estate… or saving.", author: "Andrew Carnegie" },
  { text: "Saving is the first step to wealth. Then comes investing.", author: "Unknown" },
  { text: "Patience is the key to financial success.", author: "Unknown" },
  { text: "Every big goal starts with a single consistent action.", author: "Unknown" },
  { text: "Don't think of saving as a sacrifice. Think of it as a gift to your future self.", author: "Unknown" },
  { text: "The real measure of your wealth is how much you'd be worth if you lost all your money.", author: "Unknown" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Financial goals are dreams with deadlines.", author: "Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Progress, no matter how small, is still progress.", author: "Unknown" },
  { text: "Dreams don't work unless you do.", author: "John C. Maxwell" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
]

/**
 * Returns a deterministic daily quote based on the current date.
 * The quote rotates every day and is the same for all users on any given day.
 */
export function getDailyQuote(): { text: string; author: string } {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay)
  return quotes[dayOfYear % quotes.length]
}
