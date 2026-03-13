import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

const solutions = [
  {
    number: "1",
    title: "Streamlined Workflow",
    description:
      "Automate repetitive tasks and optimize your team's productivity with our intuitive workflow management tools.",
    link: "#",
  },
  {
    number: "2",
    title: "Data-Driven Insights",
    description:
      "Gain valuable insights from your data with our advanced analytics and reporting features.",
    link: "#",
  },
  {
    number: "3",
    title: "Seamless Integration",
    description:
      "Easily integrate with your existing tools and systems for a smooth transition and enhanced functionality.",
    link: "#",
  },
]

export function Component() {
  return (
    <section id="features">
      <div className="container px-4 py-12 md:px-6 md:py-24 lg:py-32">
        <div className="mx-auto space-y-4 py-6 text-center">
          <h2 className="text-primary font-mono text-[14px] font-medium tracking-tight">
            Solutions
          </h2>
          <h4 className="mx-auto mb-2 max-w-3xl text-[42px] font-medium tracking-tighter text-balance">
            Transforming Your Business
          </h4>
        </div>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {solutions.map((solution, index) => (
            <Card key={index} className="border-none shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="text-primary mb-2 flex size-12 items-center justify-center rounded-full border text-3xl font-bold">
                  {solution.number}
                </div>
                <h3 className="mb-2 text-xl font-bold">{solution.title}</h3>
                <p className="mb-4 text-gray-500">{solution.description}</p>
                <Link
                  href={solution.link}
                  className="text-primary hover:text-primary inline-flex items-center transition-colors"
                >
                  Learn More
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
