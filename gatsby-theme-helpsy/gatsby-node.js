const fs = require("fs");
const path = require("path");
const { createFilePath } = require("gatsby-source-filesystem");

const DEFAULT_OPTIONS = {
  basePath: "/"
};

// Enable resolving imports for mdx
exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      modules: [path.resolve(__dirname, "src"), "node_modules"]
    }
  });
};

// Make sure the data directory exists
exports.onPreBootstrap = ({ reporter }) => {
  const contentPath = "src/data";
  if (!fs.existsSync(contentPath)) {
    reporter.info(`creating the ${contentPath} directory`);
    fs.mkdirSync(contentPath);
  }
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === "Mdx") {
    const value = createFilePath({ node, getNode });
    const articleSlug = `/articles${value}`;

    createNodeField({
      name: "slug",
      node,
      value: articleSlug
    });
  }
};

exports.sourceNodes = ({ actions }) => {
  actions.createTypes(`
    type Category implements Node @dontInfer {
      id: ID!
      name: String!
      description: String!
      slug: String!
      order: Int!
      url: String!
      image: String!
    }
  `);
};

exports.createResolvers = ({ createResolvers }, options) => {
  const basePath = options.basePath || DEFAULT_OPTIONS.basePath;

  createResolvers({
    Category: {
      url: {
        resolve: source => `${basePath}categories/${source.slug}`
      }
    }
  });
};

exports.createPages = async ({ actions, graphql, reporter }, options) => {
  const basePath = options.basePath || DEFAULT_OPTIONS.basePath;
  const { createPage } = actions;

  // Create the index page
  createPage({
    path: basePath,
    component: require.resolve("./src/home.tsx")
  });

  const result = await graphql(`
    query {
      allCategory(sort: { fields: order, order: ASC }) {
        nodes {
          id
          slug
        }
      }
      allMdx {
        edges {
          node {
            id
            fields {
              slug
            }
            frontmatter {
              title
            }
          }
        }
      }
    }
  `);

  if (result.errors) {
    reporter.panic("Error loading data to create pages", result.errors);
    return;
  }

  const categories = result.data.allCategory.nodes;
  const articles = result.data.allMdx.edges;

  // Create index pages for each help center category
  categories.forEach(category => {
    const { id, slug } = category;

    createPage({
      path: `${basePath}categories/${slug}`,
      component: require.resolve("./src/templates/category.tsx"),
      context: {
        categoryId: id
      }
    });
  });

  // Create pages for each help center article
  articles.forEach(({ node }) => {
    console.log({ path: node.fields.slug, id: node.id });

    createPage({
      path: node.fields.slug,
      component: require.resolve("./src/templates/article.tsx"),
      context: {
        articleId: node.id
      }
    });
  });
};
