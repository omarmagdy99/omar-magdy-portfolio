export const projects = [
  {
    slug: 'sales-retail', number: '01', title: 'Sales & Retail Analytics',
    category: 'Sales intelligence', type: 'Portfolio project',
    headline: 'A clearer view of what sells. And what comes back.',
    summary: 'A two-page Power BI report connecting sales trends, product performance and returns—so the next question is easier to answer.',
    description: 'Explore Omar Magdy’s Sales & Retail Power BI dashboard: year-over-year sales, regional performance, returns and an interactive Product Explorer.',
    tags: ['Power BI', 'DAX', 'Power Query', 'Data modeling'], image: 'retail-overview',
    imageSize: [2833,1465], color: 'rose',
    details: [['Report pages', 'Overview + Product Explorer'], ['Model', '4 fact tables + 4 dimensions'], ['Role', 'Data model, DAX & report design']],
    challenge: 'Sales totals only tell part of the story. A useful retail report also needs to show how products, regions, discounts and returns affect those totals—and make comparisons consistent when filters change.',
    approach: 'I built a star schema with four fact tables and four shared dimensions, supported by 66 DAX measures organized in display folders. Power Query reads the source files through a single folder parameter. The report moves from an executive overview into product-level exploration.',
    capabilities: [
      ['Start with the big picture', 'Sales, orders, average order value, discount percentage and return rate sit together in the Overview. Monthly trends compare current sales with the prior year.'],
      ['Follow the product story', 'The Product Explorer combines category filters, quarterly sales rankings, a sales-versus-returns bubble chart and a product-by-region matrix.'],
      ['Keep comparisons meaningful', 'Prior-year DAX measures require a single selected year, avoiding a misleading comparison across multiple years. Related measures cover YTD, month-over-month changes and selection-aware sales shares.']
    ],
    outcome: 'The result is an interactive reporting workflow: review the headline KPIs, identify a region or product worth investigating, then explore its sales and return patterns. Year and category filters help readers move from a broad overview to a focused question.',
    gallery: [
      ['retail-overview', 'Sales Overview', 'Sales KPIs, year-over-year trends, regional results and payment methods in one view.', [2833,1465]],
      ['retail-products', 'Product Explorer', 'Quarterly rankings, sales versus returns and a product-by-region matrix.', [2833,1465]],
      ['retail-chair', 'A closer look at one product', 'A filtered Product Explorer view showing how the report responds to a product selection.', [2833,1465]]
    ],
    video: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7512802432620617729?collapsed=1',
    videoLink: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7512802432620617729/',
    sourceNote: 'Built with a public practice dataset. The figures illustrate the report’s analytical capabilities and are not client business results.'
  },
  {
    slug: 'adventureworks-sales', number: '02', title: 'AdventureWorks Sales Analysis',
    category: 'Business reporting', type: 'Portfolio project',
    headline: 'From revenue totals to the story behind the sale.',
    summary: 'An executive-to-detail sales dashboard covering revenue, regional performance, products and customer segments.',
    description: 'AdventureWorks sales analysis by Omar Magdy: a Power BI dashboard exploring revenue, regions, products and customers, with downloadable documentation.',
    tags: ['Power BI', 'DAX', 'SQL'], image: 'sales-overview', imageSize: [853,497], color: 'mint',
    details: [['Report views', 'Executive, regions, products & customers'], ['Focus', 'Revenue & sales performance'], ['Role', 'Analysis & dashboard development']],
    challenge: 'A sales team needs more than a single headline number. It needs a connected view of overall performance, the regions contributing to it, and the products and customers behind it.',
    approach: 'I organized the report into an executive overview and focused geographic, product and customer views. Power BI and DAX support the report calculations, with SQL included in the project’s analysis toolset.',
    capabilities: [
      ['Executive overview', 'A starting point for reviewing revenue and key sales indicators before moving into the detail.'],
      ['Regional and product analysis', 'Dedicated views make geographic differences and product-level order performance easier to investigate.'],
      ['Customer context', 'A customer analytics view connects the sales picture to the people and segments behind it.']
    ],
    outcome: 'Four connected report views give stakeholders a structured way to move from a business question to the supporting detail. The project documentation provides additional context for reviewing the work.',
    gallery: [
      ['sales-overview', 'Executive overview', 'The report’s starting point for revenue and sales KPIs.', [853,497]],
      ['sales-regions', 'Regional performance', 'A geographic view of sales performance.', [870,499]],
      ['sales-products', 'Product detail', 'Product-level orders and target analysis.', [853,497]],
      ['sales-customers', 'Customer analytics', 'A closer look at customers and sales contribution.', [855,497]]
    ],
    pdf: ['sales-documentation.pdf', 'Read the sales documentation']
  },
  {
    slug: 'call-center', number: '03', title: 'Call Center Performance',
    category: 'Operations analytics', type: 'Operations project',
    headline: 'Make daily operational performance easier to read.',
    summary: 'A focused reporting view for contact-center operations, bringing handling time, service level and satisfaction metrics together.',
    description: 'Omar Magdy’s call center Power BI project brings AHT, SLA and CSAT into a clear operations reporting view. Explore the dashboard and video walkthrough.',
    tags: ['Power BI', 'SQL', 'Excel'], image: 'call-center', imageSize: [966,549], color: 'sand',
    details: [['Business area', 'Contact-center operations'], ['Focus', 'AHT, SLA & CSAT'], ['Role', 'Reporting & dashboard development']],
    challenge: 'Contact-center teams have to read several indicators together. Handling time, service levels and customer satisfaction each describe a different part of the operation; reviewing them in isolation can hide the wider picture.',
    approach: 'I brought the key operational indicators into a Power BI reporting view, using SQL and Excel in the reporting workflow. The layout supports a consistent daily review rather than a collection of disconnected reports.',
    capabilities: [
      ['Operational KPIs in context', 'Average handling time, service-level percentage and customer satisfaction are presented as part of the same reporting picture.'],
      ['A repeatable review', 'A consolidated dashboard gives operational stakeholders a common place to review performance.'],
      ['A visible walkthrough', 'The LinkedIn demonstration adds context to the static dashboard screenshot.']
    ],
    outcome: 'The dashboard organizes operational reporting around the indicators teams use in daily decisions, making it easier to review handling time, service levels and customer satisfaction together.',
    gallery: [['call-center', 'Operations dashboard', 'A view of the contact-center performance report.', [966,549]]],
    video: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7361292068108873728?compact=1',
    videoLink: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7361292068108873728/'
  },
  {
    slug: 'hr-analytics', number: '04', title: 'HR People Analytics',
    category: 'People analytics', type: 'Portfolio project',
    headline: 'Understand the workforce behind the numbers.',
    summary: 'A people analytics dashboard for exploring headcount, compensation, termination rates and departmental differences.',
    description: 'Explore Omar Magdy’s HR Power BI dashboard for headcount, compensation and departmental analysis, including documentation and a video walkthrough.',
    tags: ['Power BI', 'DAX', 'Power Query'], image: 'hr-analytics', imageSize: [667,381], color: 'mint',
    details: [['Business area', 'Human resources'], ['Focus', 'Headcount & compensation'], ['Role', 'Data preparation, DAX & visualization']],
    challenge: 'Workforce information becomes more useful when headcount, salary and termination patterns can be explored together. A clear report needs to help readers understand both the overall picture and departmental differences.',
    approach: 'I used Power Query, DAX and Power BI to build a people analytics view covering workforce size, average salary, termination rates and gender pay comparisons, with department-level reporting.',
    capabilities: [
      ['Workforce overview', 'Headcount and termination indicators provide a starting point for understanding workforce composition.'],
      ['Compensation context', 'Average salary and gender pay comparisons help readers explore patterns that deserve further investigation.'],
      ['Documentation alongside the report', 'The supporting PDF and video walkthrough make the work easier to review and understand.']
    ],
    outcome: 'The project provides a structured view of workforce and compensation patterns, supported by report documentation and a visual walkthrough. Readers can explore the overall workforce picture and the differences between departments.',
    gallery: [['hr-analytics', 'People analytics overview', 'Headcount, compensation and workforce indicators in the HR dashboard.', [667,381]]],
    pdf: ['hr-documentation.pdf', 'Read the HR documentation'],
    video: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7466963677263323136?compact=1',
    videoLink: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7466963677263323136/'
  }
];
