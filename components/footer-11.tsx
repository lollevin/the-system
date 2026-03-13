import Link from "next/link"
import { Instagram, Twitter, Youtube } from "lucide-react"

const footerLinks = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Use Cases", "Integrations", "API"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Tutorials", "Blog", "Community", "Support"],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Press", "Contact", "Partners"],
  },
]

const socialLinks = [
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Youtube, label: "Youtube", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
]

export function Footer() {
  return (
    <section id="footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {footerLinks.map((column, index) => (
            <div key={index} className="space-y-4">
              <h3 className="text-lg font-semibold">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href="#"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connect</h3>
            <ul className="space-y-2">
              {socialLinks.map((social, index) => (
                <li key={index}>
                  <Link
                    href={social.href}
                    className="text-muted-foreground hover:text-primary flex items-center space-x-2 transition-colors"
                  >
                    <social.icon size={20} />
                    <span>{social.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-border text-muted-foreground mt-12 flex flex-col items-center justify-between border-t pt-8 text-sm md:flex-row">
          <p>© {new Date().getFullYear()} AI SaaS Co. All rights reserved.</p>
          <div className="mt-4 flex space-x-4 md:mt-0">
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Cookie Settings
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
