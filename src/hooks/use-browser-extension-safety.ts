import { useEffect } from 'react'

/**
 * Hook to handle browser extension interference, particularly Google Translate
 * This prevents the app from crashing when extensions try to manipulate the DOM
 */
export function useBrowserExtensionSafety() {
  useEffect(() => {
    // Override the removeChild method to handle extension interference
    const originalRemoveChild = Node.prototype.removeChild

    Node.prototype.removeChild = function<T extends Node>(child: T): T {
      try {
        // Check if the child actually belongs to this parent
        if (!this.contains(child)) {
          console.warn('Browser extension attempted to remove a node that is not a child of the parent')
          console.warn('This is likely caused by Google Translate or another browser extension')
          // Return the child as if it was removed successfully
          return child
        }
        return originalRemoveChild.call(this, child) as T
      } catch (error) {
        // If it's the specific NotFoundError we're looking for, handle it gracefully
        if (error instanceof DOMException && 
            error.name === 'NotFoundError' && 
            error.message.includes('not a child of this node')) {
          console.warn('Browser extension interference detected and handled safely')
          return child
        }
        // Re-throw other errors
        throw error
      }
    }

    // Cleanup: restore original method when component unmounts
    return () => {
      Node.prototype.removeChild = originalRemoveChild
    }
  }, [])

  useEffect(() => {
    // Also handle cases where extensions try to manipulate text nodes
    const originalInsertBefore = Node.prototype.insertBefore

    Node.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
      try {
        return originalInsertBefore.call(this, newNode, referenceNode) as T
      } catch (error) {
        // Handle extension interference
        if (error instanceof DOMException) {
          console.warn('Browser extension interference detected during insertBefore')
          return newNode
        }
        throw error
      }
    }

    return () => {
      Node.prototype.insertBefore = originalInsertBefore
    }
  }, [])
}
