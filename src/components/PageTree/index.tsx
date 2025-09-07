import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.scss';

interface PageNode {
  title: string;
  path: string;
  children?: PageNode[];
}

const pageTree: PageNode[] = [
  {
    title: '📚 Documentation',
    path: '/docs/intro',
    children: [
      {
        title: 'Introduction',
        path: '/docs/intro'
      },
      {
        title: 'Tutorial - Basics',
        path: '/docs/tutorial-basics',
        children: [
          {
            title: 'Create a Page',
            path: '/docs/tutorial-basics/create-a-page'
          },
          {
            title: 'Create a Document',
            path: '/docs/tutorial-basics/create-a-document'
          },
          {
            title: 'Create a Blog Post',
            path: '/docs/tutorial-basics/create-a-blog-post'
          },
          {
            title: 'Markdown Features',
            path: '/docs/tutorial-basics/markdown-features'
          },
          {
            title: 'Deploy your site',
            path: '/docs/tutorial-basics/deploy-your-site'
          },
          {
            title: 'Congratulations',
            path: '/docs/tutorial-basics/congratulations'
          }
        ]
      },
      {
        title: 'Tutorial - Extras',
        path: '/docs/tutorial-extras',
        children: [
          {
            title: 'Manage Docs Versions',
            path: '/docs/tutorial-extras/manage-docs-versions'
          },
          {
            title: 'Translate your site',
            path: '/docs/tutorial-extras/translate-your-site'
          }
        ]
      }
    ]
  },
  {
    title: '📝 Pages',
    path: '/markdown-page',
    children: [
      {
        title: 'Markdown Page',
        path: '/markdown-page'
      },
      {
        title: 'Spring Boot 2 and External Libs',
        path: '/spring-boot-2-and-external-libs-with-the-properties-launcher'
      },
      {
        title: 'System Design',
        path: '/system-design'
      }
    ]
  },
  {
    title: '📰 Blog',
    path: '/blog',
    children: [
      {
        title: 'Blog Home',
        path: '/blog'
      },
      {
        title: 'Welcome Post',
        path: '/blog/welcome'
      },
      {
        title: 'MDX Blog Post',
        path: '/blog/mdx-blog-post'
      },
      {
        title: 'Long Blog Post',
        path: '/blog/long-blog-post'
      },
      {
        title: 'First Blog Post',
        path: '/blog/first-blog-post'
      }
    ]
  }
];

interface TreeNodeProps {
  node: PageNode;
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level = 0 }) => {
  return (
    <div className={styles.treeNode} style={{ marginLeft: `${level * 20}px` }}>
      <div className={styles.nodeContent}>
        <span className={styles.nodeIcon}>
          {node.children ? '📁' : '📄'}
        </span>
        <Link to={node.path} className={styles.nodeLink}>
          {node.title}
        </Link>
      </div>
      {node.children && (
        <div className={styles.children}>
          {node.children.map((child, index) => (
            <TreeNode key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const PageTree: React.FC = () => {
  return (
    <div className={styles.pageTree}>
      <h2 className={styles.title}>📖 Site Navigation</h2>
      <div className={styles.tree}>
        {pageTree.map((node, index) => (
          <TreeNode key={index} node={node} />
        ))}
      </div>
    </div>
  );
};

export default PageTree;
