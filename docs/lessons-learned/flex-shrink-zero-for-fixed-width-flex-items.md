# Fixed-Width Flex Items Need Flex-Shrink Zero

When building a fixed-width element inside a flex container (like a 72px sidebar rail), setting `width: 72px` is not enough.

Because flex items have `flex-shrink: 1` by default, if a sibling flex item (like the main content area) contains elements that cannot wrap or shrink below a certain size (like scrollbars, long strings without wrapping, or fixed-width inner components), the intrinsic minimum width of the flex container's children will exceed the available space. 

When this happens, the flex layout algorithm will shrink *all* items that have `flex-shrink > 0`, including the nominally "fixed-width" sidebar rail.

**The Fix:**
Always add `flex-shrink: 0` to fixed-width flex children (like sidebars, rails, or icons) to explicitly opt them out of the flex container's shrinking behavior.
