1. Design consistency
Preserve the existing logo, colors, typography, and layout.
If no design exists, ask the user about the shop name and preferred style before building.
Keep navigation, buttons, spacing, and components consistent across pages.
Do not redesign existing pages without permission.
2. Technology
Next.js App Router
TypeScript
Tailwind CSS
Reusable React components
Use the project's existing dependencies.
Do not switch frameworks or add large libraries without approval.

3. Required pages
Home: hero section, featured electronics, categories, and promotional sections.
Products: responsive product grid, search, filters, and sorting.
Product details: images, price, brand, specifications, stock status, and add-to-cart button.
Cart: product quantities, remove actions, subtotal, and checkout.
Login and signup: accessible forms with validation and clear feedback.
My Orders: order history for the authenticated customer.
4. Visual design
Use a clean, modern electronics-store aesthetic.
Make product images, prices, and purchase actions easy to find.
Use consistent spacing, border radii, shadows, and typography.
Maintain sufficient contrast between text and backgrounds.
Avoid excessive animations, gradients, and decorative elements.
Use a consistent design system instead of styling every page independently.
5. Responsive design
Design mobile-first.
Use responsive Tailwind utilities for mobile, tablet, and desktop.
Ensure product grids adapt to available screen width.
Prevent horizontal scrolling.
Make buttons and form controls comfortable to use on touchscreens.
Test navigation menus, product cards, filters, and cart layouts at different viewport sizes.
6. Reusable components
Create or reuse components such as:

Navbar
Footer
ProductCard
ProductGrid
CategoryCard
SearchBar
FilterSidebar
PriceDisplay
StockBadge
QuantitySelector
CartItem
LoadingState
EmptyState
ErrorMessage
FormInput
Button
Inspect the existing components before creating duplicates.

7. Interaction and accessibility
Show loading states when data is being fetched.
Show success messages after successful actions.
Display clear error messages when an action fails.
Provide useful empty states when no products match.
Use semantic HTML and properly associated form labels.
Support keyboard navigation and visible focus indicators.
Add descriptive alternative text to meaningful images.
Respect reduced-motion preferences.
8. Data and security
Load products from MongoDB through the existing server-side architecture.
Do not hardcode production product data in frontend components.
Never expose database credentials, JWT secrets, or Stripe secret keys.
Treat client-side validation as a usability aid, not a security boundary.
Keep price calculations and checkout validation on the server.
Follow the existing authentication and authorization rules.
9. Code quality
Use TypeScript types for component props and data.
Prefer small, reusable components.
Avoid unnecessary client components.
Use server components by default unless client-side interactivity is required.
Keep styling readable and avoid duplicated Tailwind classes where practical.
Do not rewrite working features when a small change is sufficient.
10. Testing and delivery
Before completing a frontend task:

Test mobile and desktop layouts.
Check navigation and links.
Test forms, loading states, empty states, and error states.
Check product images and long product names.
Verify accessibility basics.
Confirm existing features still work.
After each task, explain in 2–3 short sentences what changed and how to test it. Use simple language suitable for a beginner.