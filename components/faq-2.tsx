import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "What is your AI SaaS product?",
    answer:
      "Our AI SaaS product is a cutting-edge artificial intelligence platform that helps businesses automate tasks, gain insights from data, and improve decision-making processes. It combines machine learning, natural language processing, and predictive analytics to deliver powerful AI capabilities through an easy-to-use cloud-based interface.",
  },
  {
    question: "How does your pricing model work?",
    answer:
      "We offer tiered pricing based on usage and features. Our plans start with a free tier for individuals and small teams, and scale up to enterprise solutions for large organizations. Each tier includes a set number of API calls, data storage, and access to specific AI models. Custom pricing is available for high-volume users or those with specific needs.",
  },
  {
    question: "Is my data safe and secure?",
    answer:
      "Absolutely. We take data security very seriously. All data is encrypted in transit and at rest using industry-standard protocols. We comply with GDPR, CCPA, and other relevant data protection regulations. Our systems undergo regular security audits, and we offer features like two-factor authentication and single sign-on (SSO) for added security.",
  },
  {
    question: "Do I need technical expertise to use your platform?",
    answer:
      "While our platform is powerful, it's designed to be user-friendly for both technical and non-technical users. We provide an intuitive interface, pre-built models, and extensive documentation to help you get started quickly. For more advanced use cases, we offer APIs and SDKs for developers who want to integrate our AI capabilities into their own applications.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "We provide comprehensive support to ensure your success. This includes 24/7 email support for all users, live chat during business hours, and dedicated account managers for enterprise customers. We also offer extensive documentation, video tutorials, and regular webinars to help you make the most of our platform. Our community forum is a great place to connect with other users and share best practices.",
  },
]

export function Component() {
  return (
    <section id="faq">
      <div className="container w-full px-4 py-12 md:px-6 md:py-24 lg:py-32">
        <div className="mx-auto space-y-4 py-6 text-center">
          <h2 className="text-primary font-mono text-[14px] font-medium tracking-tight">
            FAQ
          </h2>
          <h4 className="mx-auto mb-2 max-w-3xl text-[42px] font-medium tracking-tighter text-balance">
            Frequently Asked Questions
          </h4>
        </div>
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="hover:border-primary [&[data-state=open]]:border-primary rounded-xl border border-gray-200 shadow-sm transition-all"
              >
                <AccordionTrigger className="px-4 py-4 text-left text-base font-medium sm:text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-sm sm:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
