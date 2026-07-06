export type FieldType = "text" | "richtext" | "number" | "image" | "icon_select" | "repeater";

export interface FieldDef {
  key: string;
  type: FieldType;
  bilingual?: boolean;
  itemFields?: FieldDef[];  // for repeater
}

export interface SectionDef {
  label: string;
  fields: FieldDef[];
}

export interface PageDef {
  label: string;
  publicPath: string;
  sections: Record<string, SectionDef>;
}

export const pageRegistry: Record<string, PageDef> = {
  home: {
    label: "Home",
    publicPath: "/",
    sections: {
      hero: {
        label: "Hero Banner",
        fields: [
          { key: "headline",       type: "text",  bilingual: true },
          { key: "subheadline",    type: "text",  bilingual: true },
          { key: "cta_primary",    type: "text",  bilingual: true },
          { key: "cta_secondary",  type: "text",  bilingual: true },
          { key: "background_image", type: "image" },
        ],
      },
      company_intro: {
        label: "Company Introduction",
        fields: [
          { key: "story",          type: "richtext", bilingual: true },
          { key: "stat_countries", type: "number" },
          { key: "stat_members",   type: "number" },
          { key: "stat_products",  type: "number" },
          { key: "stat_years",     type: "number" },
          { key: "stat_awards",    type: "number" },
        ],
      },
      opportunity_teaser: {
        label: "Opportunity Timeline",
        fields: [
          { key: "steps", type: "repeater", itemFields: [
            { key: "label", type: "text", bilingual: true },
          ]},
        ],
      },
      benefits: {
        label: "Distributor Benefits",
        fields: [
          { key: "headline", type: "text", bilingual: true },
          { key: "items", type: "repeater", itemFields: [
            { key: "icon",        type: "icon_select" },
            { key: "title",       type: "text", bilingual: true },
            { key: "description", type: "text", bilingual: true },
          ]},
        ],
      },
      newsletter: {
        label: "Newsletter Section",
        fields: [
          { key: "headline", type: "text", bilingual: true },
          { key: "body",     type: "text", bilingual: true },
        ],
      },
    },
  },

  about: {
    label: "Our Story",
    publicPath: "/about",
    sections: {
      hero: {
        label: "Page Header",
        fields: [
          { key: "title",        type: "text",  bilingual: true },
          { key: "subtitle",     type: "text",  bilingual: true },
          { key: "banner_image", type: "image" },
        ],
      },
      our_story: {
        label: "Our Story Body",
        fields: [{ key: "body", type: "richtext", bilingual: true }],
      },
      mission: {
        label: "Mission",
        fields: [{ key: "body", type: "richtext", bilingual: true }],
      },
      vision: {
        label: "Vision",
        fields: [{ key: "body", type: "richtext", bilingual: true }],
      },
      leadership_intro: {
        label: "Leadership Section Intro",
        fields: [{ key: "body", type: "text", bilingual: true }],
      },
      certifications_intro: {
        label: "Certifications Intro",
        fields: [{ key: "body", type: "text", bilingual: true }],
      },
    },
  },

  products: {
    label: "Products",
    publicPath: "/products",
    sections: {
      hero: {
        label: "Page Header",
        fields: [
          { key: "title",    type: "text", bilingual: true },
          { key: "subtitle", type: "text", bilingual: true },
        ],
      },
    },
  },

  wellness: {
    label: "Wellness Hub",
    publicPath: "/wellness",
    sections: {
      hero: {
        label: "Page Header",
        fields: [
          { key: "title",    type: "text", bilingual: true },
          { key: "subtitle", type: "text", bilingual: true },
        ],
      },
      intro: {
        label: "Introduction",
        fields: [{ key: "body", type: "richtext", bilingual: true }],
      },
    },
  },

  events: {
    label: "Events",
    publicPath: "/events",
    sections: {
      hero: {
        label: "Page Header",
        fields: [
          { key: "title",    type: "text", bilingual: true },
          { key: "subtitle", type: "text", bilingual: true },
        ],
      },
    },
  },

  blog: {
    label: "Blog",
    publicPath: "/blog",
    sections: {
      hero: {
        label: "Page Header",
        fields: [
          { key: "title",    type: "text", bilingual: true },
          { key: "subtitle", type: "text", bilingual: true },
        ],
      },
    },
  },

  gallery: {
    label: "Gallery",
    publicPath: "/gallery",
    sections: {
      hero: {
        label: "Page Header",
        fields: [
          { key: "title",    type: "text", bilingual: true },
          { key: "subtitle", type: "text", bilingual: true },
        ],
      },
    },
  },

  contact: {
    label: "Contact",
    publicPath: "/contact",
    sections: {
      hero: {
        label: "Page Header",
        fields: [
          { key: "title",    type: "text", bilingual: true },
          { key: "subtitle", type: "text", bilingual: true },
        ],
      },
      intro: {
        label: "Intro Copy",
        fields: [{ key: "body", type: "text", bilingual: true }],
      },
    },
  },

  become_distributor: {
    label: "Become a Distributor",
    publicPath: "/become-distributor",
    sections: {
      hero: {
        label: "Hero",
        fields: [
          { key: "headline",         type: "text",  bilingual: true },
          { key: "subheadline",      type: "text",  bilingual: true },
          { key: "cta",              type: "text",  bilingual: true },
          { key: "background_image", type: "image" },
        ],
      },
      benefits_recap: {
        label: "Benefits Recap",
        fields: [{ key: "body", type: "richtext", bilingual: true }],
      },
      faq_strip_intro: {
        label: "FAQ Strip Intro",
        fields: [{ key: "body", type: "text", bilingual: true }],
      },
    },
  },
};
