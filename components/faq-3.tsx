const faqItems = [
  {
    question: "Do I have to pay to keep using the AI service?",
    answer:
      "Our AI service offers both free and paid tiers. While you can continue using basic features for free, premium features and increased usage limits require a subscription. We believe in providing value before asking for commitment.",
  },
  {
    question: "What happens if I downgrade my plan?",
    answer:
      "When you downgrade your plan, you'll retain access to all features until the end of your current billing cycle. Afterward, your account will transition to the features and limits of the new plan. Don't worry, your existing data and projects will remain intact.",
  },
  {
    question: "How can I switch between different subscription plans?",
    answer:
      "Switching plans is easy and can be done at any time from your account settings. If you upgrade, you'll have immediate access to new features. If you downgrade, changes will take effect at the start of your next billing cycle.",
  },
  {
    question: "Are there any discounts available?",
    answer:
      "We offer discounts for annual subscriptions, typically saving you about 20% compared to monthly billing. We also have special rates for educational institutions and non-profit organizations. Contact our sales team for more information.",
  },
  {
    question: "How can I cancel my subscription?",
    answer:
      "You can cancel your subscription at any time from your account settings. Your service will continue until the end of your current billing period. We don't offer refunds for partial months, but you're welcome to continue using the service until your paid period ends.",
  },
]

export function Component() {
  return (
    <section id="faq">
      <div className="container px-4 py-12 md:px-6 md:py-24 lg:py-32">
        <div className="mx-auto space-y-4 py-6 text-center">
          <h2 className="text-primary font-mono text-[14px] font-medium tracking-tight">
            FAQ
          </h2>
          <h4 className="mx-auto mb-2 max-w-3xl text-[42px] font-medium tracking-tighter text-balance">
            Frequently Asked Questions
          </h4>
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:gap-12">
          {faqItems.map((item, index) => (
            <div key={index} className="space-y-2">
              <h3 className="text-lg font-medium">{item.question}</h3>
              <p className="text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
