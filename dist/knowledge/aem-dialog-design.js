/**
 * AEM Component Dialog Design Best Practices
 *
 * Comprehensive guidelines for creating usable, maintainable, and performant
 * component dialogs in AEM as a Cloud Service.
 *
 * Core principles:
 * - Simplicity: minimize options, maximize clarity
 * - Consistency: align naming, field structure, and behavior across components
 * - Author-first: design for CMS author productivity
 * - Policy-driven: offload admin/template-level config to template policies
 * - Accessibility: CoralUI compliance, tooltips, validation, help paths
 */
export const DIALOG_PRINCIPLES = [
    {
        id: 'naming-consistency',
        title: 'Component Naming System',
        description: 'Design a versatile, well-defined naming system in collaboration with CMS authors. Core concept first, then variant/modifier. Use sorting codes (e.g., c02x, c01x) or alphabetical grouping to ensure consistent ordering in component lists.',
        rationale: 'Consistent naming reduces author confusion, speeds discovery, and ensures components group together logically. Versioning (Teaser Large vs. Large Teaser) guarantees all "Teaser" variants appear together, not scattered alphabetically.',
        examples: [
            'Teaser Large, Teaser Feature, Teaser Landing (groups all teasers)',
            'Code prefix: c010-c019 (teasers), c020-c029 (lists), c030-c039 (media blocks)',
            'Component name in dialog MUST match list name — no abbreviations or variants',
        ],
        antiPatterns: [
            'Large Teaser, Feature Teaser, Landing Teaser (scattered across L, F, L)',
            'Using abbreviations in dialog ("Large Tsr") vs full name ("Teaser Large") in lists',
            'Different titles in component JCR vs. dialog vs. Granite UI',
        ],
    },
    {
        id: 'dialog-simplicity',
        title: 'Maximize Brevity & Avoid Overloading',
        description: 'Keep dialogs simple and focused. Avoid visual clutter, excessive options, and over-parameterization. Use tabs for logical grouping by priority/frequency. Offload rarely-used settings to template policies or author-controlled hide/show.',
        rationale: 'Simple dialogs improve author confidence, reduce entry errors, and accelerate content authoring. Overloaded dialogs create decision paralysis and slow down the CMS.',
        examples: [
            'Group related fields under "Advanced" or "Styling" tabs (only shown when needed)',
            'Critical fields (title, text) on main tab; formatting on secondary tab',
            'Use template policies to pre-set color palettes and aspect ratios per template',
        ],
        antiPatterns: [
            'Single flat list of 20+ fields with no grouping',
            'Duplicate controls for the same concept (color picker + hex input + palette dropdown)',
            'Putting "show in sitemap" toggle in the component dialog when it belongs in page properties',
        ],
    },
    {
        id: 'tab-organization',
        title: 'Logical Tab Grouping',
        description: 'Use tabs to organize fields by logical concern (Properties, Styling, Advanced) and by priority/frequency. Primary tab = fields authors use 90% of the time.',
        rationale: 'Tabs reduce cognitive load and allow authors to focus on the most important fields without distraction.',
        examples: [
            'Properties tab: title, description, CTA',
            'Styling tab: background color, text alignment, spacing (if not delegated to Style System)',
            'Advanced tab: metadata, tracking, custom CSS classes',
        ],
        antiPatterns: [
            'All fields on one tab with no separation',
            'Advanced fields mixed with basic fields in any order',
            'Tabs that duplicate information (same field on multiple tabs)',
        ],
    },
    {
        id: 'policy-driven-config',
        title: 'Policy-Driven Configuration',
        description: 'Offload component behavior configuration (allowed colors, heading levels, aspect ratios, smart crop settings) to template policies, not component dialogs. Set once per template, apply to all instances.',
        rationale: 'Policies ensure consistency across a template, reduce author mistakes, and simplify dialogs. Admins control policy; authors choose from pre-approved options.',
        examples: [
            'Allowed colors, heading levels, image aspect ratios → policies',
            'Image smart crop and sizing instructions → defined in policy, not component dialog',
            'Default spacing/margins for all components on a template → policy-level',
        ],
        antiPatterns: [
            'Every instance of an image component has its own aspect ratio dropdown',
            'Color picker in component dialog with no pre-filtering from policy',
            'Duplicate smart crop config in each image-using component',
        ],
    },
    {
        id: 'style-system-over-dialog',
        title: 'Prioritize Style System for Theming',
        description: 'Use AEM Style System (predefined CSS classes) for switching themes, visual variations, and styling switches. Keep styling controls out of the component dialog.',
        rationale: 'Style System decouples layout from presentation, prevents CSS conflicts, and empowers front-end teams to manage design consistency independently of authoring workflows.',
        examples: [
            'Dark theme, light theme, accent variations → Style System classes',
            'Card shadow/border styles → CSS classes, not toggles in dialog',
            'Typography overrides (sans-serif, serif) → Style System, not component field',
        ],
        antiPatterns: [
            'Putting "Dark Mode" toggle in component dialog instead of Style System',
            'Adding individual color fields for every design variation',
            'Duplicating theme logic in both dialog logic and CSS',
        ],
    },
    {
        id: 'show-hide-logic',
        title: 'Granular Show/Hide Logic',
        description: 'Use Granite UI "foundation-toggleable" classes to dynamically show/hide tabs, field groups, or individual fields based on author selections. Keep interface clean by hiding irrelevant options.',
        rationale: 'Conditional visibility reduces confusion and guides authors through valid field combinations without removing functionality.',
        examples: [
            'Show "CTA Text" field only if "Show CTA" is toggled on',
            'Show "Image Alt Text" and "Image Title" only if "Has Image" is true',
            'Show advanced styling fields only if "Custom Styling" is enabled',
        ],
        antiPatterns: [
            'Displaying all fields regardless of author selections (confusing, suggests all are required)',
            'Hiding fields without visual feedback or explanation',
            'Complex nested conditionals that are hard to maintain (avoid >3 levels deep)',
        ],
    },
    {
        id: 'in-context-editing',
        title: 'Design for In-Context Editing',
        description: 'Avoid placing fields in the dialog that could be better handled via inline editing (text titles, short labels, basic formatting). Allow authors to edit in real-time on the page without opening a dialog.',
        rationale: 'In-context editing is faster, more intuitive, and reduces context switching. Dialogs should focus on structural and non-obvious configurations.',
        examples: [
            'Titles, short text, basic labels → inline editing on page',
            'Complex structured data, nested fields, policy-level config → component dialog',
        ],
        antiPatterns: [
            'Putting every text field in the dialog instead of offering inline editing',
            'Requiring a dialog open to see or edit field values',
        ],
    },
    {
        id: 'content-fragment-for-complex-data',
        title: 'Use Content Fragments for Complex Data',
        description: 'If a component dialog requires dozens of fields for structured, reusable data, recommend a content fragment instead. Component dialog contains only a path-picker to the fragment.',
        rationale: 'Content fragments provide better data structure, reusability, and support for complex field hierarchies. Keeps component dialog clean.',
        examples: [
            'Testimonial with author details, images, social links → CF with reference in component',
            'Event with schedule, venue, attendee list → CF with reference',
            'Product bundle with variants and pricing rules → CF with reference',
        ],
        antiPatterns: [
            'Multifield with 15 nested fields inside the component dialog',
            'Duplicate complex data entry logic across multiple components',
        ],
    },
    {
        id: 'coralui-compliance',
        title: 'Maximize CoralUI Compliance',
        description: 'Prioritize CoralUI 3 components (Coral.Switch, Coral.Radio, Coral.SelectList, Coral.TagList) to ensure consistency, reduce custom code, and maintain light/dark theme compatibility. Avoid outdated CoralUI versions or custom HTML controls in dialogs.',
        rationale: 'CoralUI ensures accessibility, theme compliance (light/dark), and vendor consistency. Custom controls introduce technical debt and maintenance burden.',
        examples: [
            'Binary yes/no → Coral.Switch (not Coral.Select)',
            'Single-choice from 2–3 options → Coral.Radio (not Coral.Select)',
            'Translatable dynamic options → Coral.TagList (not custom input)',
            'Multi-select from fixed list → Coral.SelectList (not custom multifield)',
        ],
        antiPatterns: [
            'Using Coral.Select for true/false (use Coral.Switch)',
            'Using Coral.Select for 2 options (use Coral.Radio)',
            'Custom HTML <select> elements in dialogs (breaks theming)',
            'CoralUI 2 components (out of support on Cloud)',
        ],
    },
    {
        id: 'tooltips-and-help',
        title: 'Comprehensive Tooltips & Help Paths',
        description: 'Provide a tooltip for every dialog field. Make tooltips concise yet thorough, explaining how to populate the field, boundary conditions, and limitations. Link to user manual via helpPath (circled ? icon in top-right).',
        rationale: 'Good tooltips reduce support burden, prevent data entry errors, and allow authors to work without documentation. Help paths link to deeper content for complex components.',
        examples: [
            'Tooltip: "Heading level for the component title (H2–H4). Must not exceed H2 if this is a main section."',
            'Tooltip: "Image aspect ratio: 16:9 landscape (1920×1080 px). Max file size 2 MB."',
            'helpPath: "/content/userguide/components/teaser.html"',
        ],
        antiPatterns: [
            'No tooltip (author must guess)',
            'Tooltip that just repeats the field label: "Title: [Enter title here]"',
            'Tooltip without boundary info: "Image aspect ratio" (which one? max size?)',
            'helpPath pointing to outdated or non-existent documentation',
        ],
    },
    {
        id: 'field-naming-conventions',
        title: 'Concise, Predictable Field Naming',
        description: 'Use substance-first, noun-based field names. Avoid fluff, jargon, or redundancy. Label and property name should be clear, actionable, and consistent across all components.',
        rationale: 'Clear naming reduces learning curve, prevents author errors, and makes template policies and style system rules easier to understand.',
        examples: [
            'Good: "Heading Level", "CTA Text", "Background Color", "Image Alt Text"',
            'Good properties: "headingLevel", "ctaText", "backgroundColor", "imageAltText"',
            'Bad: "What level should the title be?", "Should we show a CTA?", "Pick a color"',
            'Consistency: "Image" (noun) → imageUrl, imageAltText, imageCaptionText (not imageUrl_alt, image_caption)',
        ],
        antiPatterns: [
            'Fluff: "Enable Feature X", "Do You Want to Show the Title?"',
            'Jargon: "sRgbDeltaE", "colorimetry_space" (use "Color" instead)',
            'Inconsistent: imageAltText vs imageDescription (pick one)',
            'Property names that don\'t match field labels ("BgColor" label, "backgroundColor" property)',
        ],
    },
    {
        id: 'validation-and-defaults',
        title: 'Validation Logic & Explicit Defaults',
        description: 'Apply validation wherever a value may go out of bounds. Explain boundaries in the tooltip. Provide explicit defaultValue properties for critical fields. Use CoralUI validation patterns.',
        rationale: 'Validation prevents invalid data entry and guides authors toward correct inputs. Defaults reduce author effort and ensure sensible starting points.',
        examples: [
            'Number field (image width): min="320" max="1920" step="10"',
            'Text field (heading): required="true" with tooltip explaining mandatory nature',
            'Heading level: defaultValue="h2" with validation against allowed range (h2-h4)',
            'CTA text: required only if "Show CTA" toggle is on (conditional validation)',
        ],
        antiPatterns: [
            'No validation (author enters -5 for image width)',
            'Validation with no explanation in tooltip',
            'Missing defaultValue for critical fields (empty dialog on creation)',
            'Inconsistent validation across similar components',
        ],
    },
    {
        id: 'multiselect-option-modeling',
        title: 'Multiselect Options: Fixed vs. Dynamic',
        description: 'Choose the right option model based on scope and lifecycle. Fixed, untranslatable, unchanging lists → Coral.SelectList. Dynamic, translatable, frequently-changing, or reused options → AEM Tag Taxonomy with Coral.TagList.',
        rationale: 'Correct modeling prevents maintenance burden, supports internationalization, and allows non-developers to manage options.',
        examples: [
            'Fixed: "Card layout (grid, flex, stack)" → hardcoded Coral.Select options',
            'Dynamic: "Allowed colors (red, blue, green, gold)" → AEM tags, managed by admins, Coral.TagList',
            'Dynamic: "Product categories" (reused across catalog) → Tag taxonomy',
            'Fixed: "Yes/No" → Coral.Switch (not multiselect)',
        ],
        antiPatterns: [
            'Hardcoding frequently-changing options (e.g., category list) when tags would be better',
            'Using Coral.Select for translatable options (strings not in i18n)',
            'Tag taxonomy so granular it becomes unusable (too many options)',
        ],
    },
    {
        id: 'path-picker-context',
        title: 'Contextual Path Pickers',
        description: 'Pre-set initial content paths (rootPath) for each path-picker field and pre-filter selections if possible. Prevents authors from navigating the entire AEM repository and accelerates authoring.',
        rationale: 'Context-specific path pickers reduce navigation steps, prevent selection errors, and speed up authoring workflows.',
        examples: [
            'Page picker: rootPath="/content/my-site/en" (not /content)',
            'Asset picker: rootPath="/content/dam/my-site/images" + pre-filter by MIME type (images only)',
            'CF picker: rootPath="/content/dam/my-site/content-fragments" + resource type filter (model)',
        ],
        antiPatterns: [
            'Path picker with no rootPath (author starts at /)',
            'Asset picker without MIME filtering (audio, video, documents mixed with images)',
            'Allowing selection outside the site root (confuses authoring model)',
        ],
    },
    {
        id: 'aeaacs-compatibility',
        title: 'AEMaaCS Compatibility & Cloud Rules',
        description: 'Design dialogs for AEM as a Cloud Service. Ensure compatibility with SDK, avoid deprecated patterns, follow Cloud-specific validation rules, and test in Cloud Preview environment.',
        rationale: 'Cloud-specific design prevents deployment failures, reduces support costs, and ensures components are future-proof.',
        examples: [
            'Use Sling Models (OSGi services), not JSP scriplets',
            'Use Granite UI (sling:resourceType="granite/..."), not classic Ext JS',
            'Store config in JCR properties or policies, not in servlet params (no PersistenceManager in Cloud)',
            'Validate component references in publish mode (no author-only patterns)',
            'Use standard Granite UI field types; test in Cloud SDK before deploying',
        ],
        antiPatterns: [
            'Using deprecated CQ5 Ext JS dialogs',
            'Storing persistent state outside JCR',
            'Author-only component features without fallbacks',
            'Custom validation that assumes Felix Console access',
        ],
    },
];
export const DIALOG_FIELD_TYPES = [
    {
        id: 'switch-toggle',
        coralUiClass: 'Coral.Switch',
        use: 'Binary yes/no, enable/disable, or true/false selections. Single decision.',
        examples: ['Show CTA?', 'Enable Comments?', 'Full Width?'],
        validation: ['Either true or false', 'No third state', 'Optional (can be null) or required per dialog'],
        defaultProperties: { name: './showCta', checked: false, 'aria-label': 'Enable this feature' },
        antiPatterns: [
            'Using Coral.Select for true/false (unnecessary extra click)',
            'Switch with three states (use Radio or SelectList instead)',
        ],
    },
    {
        id: 'radio-button',
        coralUiClass: 'Coral.Radio',
        use: 'Single selection from 2–5 mutually exclusive options. Always visible options.',
        examples: [
            'Layout: [Horizontal] [Vertical] [Grid]',
            'Heading Level: [H2] [H3] [H4]',
            'Text Align: [Left] [Center] [Right]',
        ],
        validation: ['Exactly one option selected', 'Clear default value'],
        defaultProperties: { name: './layout', checked: true },
        antiPatterns: [
            'Using SelectList when Radio would be clearer (too many clicks)',
            'Radio with 8+ options (switch to SelectList)',
            'Radio without clear default',
        ],
    },
    {
        id: 'select-dropdown',
        coralUiClass: 'Coral.Select',
        use: 'Single selection from 5+ options, or when space is constrained. Hidden by default.',
        examples: ['Content Sort', 'Page Layout Template', 'Revision Status'],
        validation: ['One value selected', 'Options must be pre-defined or loaded from policy/tags'],
        defaultProperties: { name: './contentSort', multiple: false },
        antiPatterns: [
            'Using Select for 2 options (use Radio or Switch)',
            'Select without a default value',
        ],
    },
    {
        id: 'select-list',
        coralUiClass: 'Coral.SelectList',
        use: 'Multi-select from fixed, unchanging list (layout variants, styles). Alternative to taglist for simple cases.',
        examples: [
            'Card Features: [image] [date] [author]',
            'Supported Layouts: [wide] [standard] [compact]',
        ],
        validation: ['Multiple values allowed (array)', 'Options must be predefined or from tags/policy'],
        defaultProperties: { name: './features', multiple: true },
        antiPatterns: [
            'Using SelectList for dynamic/translatable options (use TagList)',
            'SelectList with 50+ options (consider grouping or TagList)',
        ],
    },
    {
        id: 'tag-list',
        coralUiClass: 'Coral.TagList',
        use: 'Multi-select from dynamic, translatable, or frequently-changing options. Connects to AEM tag taxonomy.',
        examples: [
            'Allowed Colors (from /etc/tags/colors)',
            'Product Categories (from /etc/tags/products)',
            'Content Topics (from /etc/tags/topics)',
        ],
        validation: ['Multiple tags allowed', 'Must have valid rootPath pointing to tag namespace', 'Supports i18n'],
        defaultProperties: { name: './colors', multiple: true, rootPath: '/etc/tags/my-site' },
        antiPatterns: [
            'Using TagList for fixed options (hardcoded SelectList is simpler)',
            'TagList without namespace hierarchy',
        ],
    },
    {
        id: 'text-input',
        coralUiClass: 'Coral.TextField',
        use: 'Short text input (titles, labels, IDs). Single line.',
        examples: ['Page Title', 'Component ID', 'CTA Button Label'],
        validation: [
            'Max length should be enforced (maxlength attribute)',
            'Pattern validation if specific format (e.g., email, URL)',
            'Tooltips should explain any character restrictions',
        ],
        defaultProperties: {
            name: './title',
            placeholder: 'Enter page title',
            maxlength: 255,
            required: true,
        },
        antiPatterns: [
            'No maxlength (author enters a novel in a "title" field)',
            'No placeholder or hint text',
        ],
    },
    {
        id: 'text-area',
        coralUiClass: 'Coral.TextArea',
        use: 'Multi-line text input (descriptions, metadata, notes). Longer form content.',
        examples: ['Meta Description', 'Component Notes', 'Long Form Content'],
        validation: ['Reasonable row height (rows="4–6")', 'Character limit if space-constrained'],
        defaultProperties: { name: './description', placeholder: 'Enter description', rows: 4 },
        antiPatterns: [
            'TextArea for short single-line text (use TextField)',
            'TextArea with no row height guidance (looks empty)',
        ],
    },
    {
        id: 'rich-text-editor',
        coralUiClass: 'Coral.RichTextEditor',
        use: 'Formatted text with styling (bold, italic, links, lists). Full WYSIWYG.',
        examples: ['Component Description', 'CTA Text with Formatting', 'Callout Body'],
        validation: ['Restrict to inline formatting only (no block elements if not needed)', 'Whitelist allowed plugins (links, lists, bold/italic)'],
        defaultProperties: { name: './richText', 'data-rte-mode': 'plustouch' },
        antiPatterns: [
            'Rich editor for plain text (use TextField or TextArea)',
            'Allowing all RTE plugins (overwhelming authors)',
        ],
    },
    {
        id: 'number-input',
        coralUiClass: 'Coral.NumberField',
        use: 'Numeric input with min/max bounds (width, padding, count).',
        examples: ['Image Width (px)', 'Max Items to Show', 'Padding (rem)'],
        validation: [
            'min / max attributes required',
            'step attribute for UI spinner guidance',
            'Tooltip must explain units and bounds',
        ],
        defaultProperties: { name: './width', min: 320, max: 1920, step: 10, defaultValue: 800 },
        antiPatterns: [
            'Number field with no min/max (author enters -999)',
            'No step or unit guidance (author guesses)',
        ],
    },
    {
        id: 'datepicker',
        coralUiClass: 'Coral.Datepicker',
        use: 'Date selection (publish date, event date, expiration).',
        examples: ['Publish Date', 'Event Date', 'Campaign End Date'],
        validation: ['ISO format internally', 'Optional or required per dialog'],
        defaultProperties: { name: './eventDate', required: false },
        antiPatterns: [
            'No locale/timezone guidance in tooltip',
            'Date field without help text explaining timezone handling',
        ],
    },
    {
        id: 'path-picker-pages',
        coralUiClass: 'granite/ui/components/coral/foundation/form/pathbrowser',
        use: 'Select AEM pages (internal links, related pages, parent reference).',
        examples: ['Link to Page', 'Related Articles', 'Parent Page'],
        validation: ['rootPath must be set (e.g., /content/my-site)', 'Can pre-filter by page template'],
        defaultProperties: {
            name: './pageRef',
            rootPath: '/content/my-site',
            pickerSrc: '/conf/my-site/settings/wcm/templates',
        },
        antiPatterns: [
            'No rootPath (author navigates from /)',
            'No template filter (author sees all pages)',
        ],
    },
    {
        id: 'path-picker-assets',
        coralUiClass: 'granite/ui/components/coral/foundation/form/pathbrowser',
        use: 'Select DAM assets (images, documents, videos).',
        examples: ['Featured Image', 'PDF Brochure', 'Video Thumbnail'],
        validation: [
            'rootPath: /content/dam/my-site/...',
            'Consider MIME type filtering (images only)',
            'Max file size guidance in tooltip',
        ],
        defaultProperties: {
            name: './image',
            rootPath: '/content/dam/my-site/images',
            pickerSrc: '/conf/my-site/settings/dam/dmImageLists/defaultImageList',
        },
        antiPatterns: [
            'Asset picker without MIME filtering (shows all file types)',
            'No guidance on image dimensions or aspect ratio',
        ],
    },
    {
        id: 'path-picker-content-fragments',
        coralUiClass: 'granite/ui/components/coral/foundation/form/pathbrowser',
        use: 'Select content fragments (structured content, reusable data).',
        examples: ['Featured Testimonial', 'Related Event', 'Product Reference'],
        validation: [
            'rootPath: /content/dam/my-site/content-fragments',
            'Filter by content model type',
            'Single selection (not multiple)',
        ],
        defaultProperties: {
            name: './fragmentRef',
            rootPath: '/content/dam/my-site/content-fragments',
        },
        antiPatterns: [
            'No model-type filter (shows all CFs)',
            'Allowing multiple CF selections (usually unnecessary)',
        ],
    },
    {
        id: 'multifield',
        coralUiClass: 'granite/ui/components/coral/foundation/form/multifield',
        use: 'Repeated field groups (list items, table rows, or related field bundles).',
        examples: [
            'List Items (text + link)',
            'Team Members (name + title + image)',
            'Testimonials (author + quote)',
        ],
        validation: [
            'Keep nested structure simple (2–4 fields per row)',
            'Avoid deeply nested multifields (multifield of multifield)',
            'Use reorder and delete buttons',
        ],
        defaultProperties: { name: './items', compositeMetadata: true },
        antiPatterns: [
            'Multifield with 15 nested fields (use Content Fragment instead)',
            'Multifield without clear visual separation between rows',
            'Multifield without + / - buttons for add/remove',
        ],
    },
    {
        id: 'image-crop',
        coralUiClass: 'Coral.CroppingImage (Core Image)',
        use: 'Smart crop and resize for images (via Core Image component).',
        examples: [
            'Featured Image with Smart Crop',
            'Thumbnail with 1:1 aspect ratio',
        ],
        validation: [
            'Aspect ratios should be defined in template policy, not component dialog',
            'Smart crop instructions in policy tooltip',
        ],
        defaultProperties: { name: './image', aspectRatio: '16:9' },
        antiPatterns: [
            'Putting crop configuration in component dialog (move to policy)',
            'No aspect ratio constraints (produces stretched/distorted images)',
        ],
    },
    {
        id: 'color-picker',
        coralUiClass: 'Coral.Colorinput',
        use: 'Color selection. Use with policy pre-filtering to limit palette.',
        examples: ['Background Color', 'Text Color', 'Accent Color'],
        validation: [
            'Pre-filter allowed colors from template policy or tag taxonomy',
            'Default color should be set',
            'Tooltip must explain color meaning (e.g., "Brand Primary")',
        ],
        defaultProperties: { name: './bgColor', defaultValue: '#ffffff', palette: ['#ffffff', '#000000', '#ff0000'] },
        antiPatterns: [
            'Unrestricted color picker (author can pick any color, breaks brand)',
            'No default (field appears empty)',
        ],
    },
];
// ─── Common Dialog Patterns ───────────────────────────────────────
export const DIALOG_PATTERNS = [
    {
        name: 'Two-Column Layout (Image + Text)',
        description: 'Component with image on one side, text on the other. Dialog includes image path, title, description, CTA.',
        tabStructure: [
            {
                title: 'Content',
                fields: ['title', 'description', 'ctaText', 'ctaUrl'],
            },
            {
                title: 'Styling',
                fields: ['layout (left|right image)', 'spacing'],
            },
        ],
        policyConfig: ['Allowed colors', 'Image aspect ratios', 'Max image file size'],
        showHideLogic: 'Show ctaText/ctaUrl only if showCta is checked',
    },
    {
        name: 'Card Grid (Repeating Items)',
        description: 'Grid of repeating card items. Each card has image, title, and body.',
        tabStructure: [
            {
                title: 'Items',
                fields: ['cardItems (multifield with image, title, body)'],
            },
            {
                title: 'Layout',
                fields: ['columns (2|3|4)', 'gutter (small|medium|large)'],
            },
        ],
        policyConfig: ['Allowed number of columns per template', 'Card aspect ratio', 'Image size constraints'],
        showHideLogic: 'Card variant from Style System class, not dialog toggle',
    },
    {
        name: 'Hero with CTA',
        description: 'Large banner with headline, subtitle, background image, and call-to-action.',
        tabStructure: [
            {
                title: 'Content',
                fields: ['heading', 'subheading', 'ctaText', 'ctaUrl'],
            },
            {
                title: 'Media',
                fields: ['backgroundImage', 'imageAlt'],
            },
            {
                title: 'Advanced',
                fields: ['customCssClass', 'tracking'],
            },
        ],
        policyConfig: [
            'Hero height (min/max)',
            'Allowed heading levels',
            'Image aspect ratio',
            'Overlay opacity',
        ],
        showHideLogic: 'Show CTA fields only if showCta switch is on',
    },
    {
        name: 'Teaser with Icon',
        description: 'Small summary card with optional icon, heading, body, and link.',
        tabStructure: [
            {
                title: 'Properties',
                fields: ['heading', 'body', 'linkText', 'linkUrl'],
            },
            {
                title: 'Advanced',
                fields: ['icon (if applicable)', 'variant (from Style System)'],
            },
        ],
        policyConfig: [
            'Allowed heading levels',
            'Max body character length',
            'Icon library or custom SVG path',
        ],
        showHideLogic: 'Show link fields only if showLink is enabled',
    },
    {
        name: 'Content Fragment Reference',
        description: 'Component that references a single content fragment (structured data). Minimal dialog.',
        tabStructure: [
            {
                title: 'Content',
                fields: ['contentFragmentRef (path picker)', 'fragmentVariation (optional)'],
            },
        ],
        policyConfig: ['Allowed CF models', 'Fragment rootPath'],
        showHideLogic: 'None (simple reference)',
    },
];
// ─── Naming Conventions & Sorting ───────────────────────────────────────
export const NAMING_CONVENTIONS = {
    codePrefix: {
        c010: 'Teasers (Teaser Large, Teaser Feature, Teaser Landing)',
        c020: 'Lists (List Default, List Compact, List Featured)',
        c030: 'Media (Hero Image, Hero Video, Hero Carousel)',
        c040: 'Text (Paragraph, Quote, Callout)',
        c050: 'Navigation (Breadcrumb, Menu, Sidebar Nav)',
        c060: 'Forms (Contact Form, Newsletter Signup, Search)',
        c070: 'Commerce (Product Card, Product Grid, Shopping Cart)',
        c080: 'Social (Social Share, Social Feed, Comments)',
        c090: 'Advanced (Tab Container, Accordion, Modal)',
    },
    componentNamingPattern: {
        coreConcept: 'What does it do? (e.g., "Teaser")',
        variant: 'Size, layout, or visual flavor (e.g., "Large", "Feature")',
        correct: 'Teaser Large, Teaser Feature, Teaser Landing',
        incorrect: 'Large Teaser, Feature Teaser, Landing Teaser',
        rationale: 'Alphabetical grouping: all teasers together under "T", then subcategories under each.',
    },
    fieldNamingPattern: {
        substance_first: 'Describe what the field IS, not what to do',
        correct: ['Heading Text', 'Image Alt Text', 'Background Color', 'CTA Button Label'],
        incorrect: [
            'Enter the Heading',
            'What should the image alternative text be?',
            'Pick a Color',
            'Label for the CTA Button',
        ],
    },
    propertyNameConvention: {
        camelCase: 'JavaScript/HTL convention',
        examples: {
            'Heading Text': 'headingText',
            'Image Alt': 'imageAltText',
            'CTA Link': 'ctaLink',
            'Show Features': 'showFeatures',
            'Max Items': 'maxItems',
        },
    },
};
//# sourceMappingURL=aem-dialog-design.js.map