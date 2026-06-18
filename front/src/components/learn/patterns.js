// Pattern Recall sheets — the structured Python-exercise format the user found
// most effective (from sources/subjects-1-3-summary.md + subjects-roadmap.md).
// Each pattern carries: the idea, the worked code to internalize, complexity,
// the key insight, and a recall drill ("rewrite from a blank file, out loud").
// Rendered by PatternRecall.jsx inside Study Plans.

// The candidate's named weak spot — shown at the top, always.
export const GOLDEN_RULES = {
  title: "The recursion checklist — run it every time",
  rules: [
    "Recurse into a smaller piece (a child — never the parent or the same node).",
    "Use what the call returns (check it, combine it — don't discard it).",
  ],
  when: [
    "Visit all nodes, any order, shortest code → recursive DFS.",
    "Need level / row info, or shortest path in an unweighted graph → BFS.",
    "Very deep tree, or asked to avoid recursion → iterative DFS with a stack.",
    "Nested dict/list (JSON) → recursive DFS with isinstance branches.",
  ],
};

// status: "done" | "next" | "later" — mirrors the user's roadmap progress.
export const PATTERNS = [
  {
    id: "rec-dfs",
    n: 1,
    title: "Recursive DFS on trees",
    status: "done",
    idea: "Pre/in/post-order differ only by WHERE you visit the node relative to the two recursive calls. The base case `if node is None` is the leaf signal that stops the recursion. Every tree problem: do something at this node, then trust the same function on the children.",
    insight: "max_depth and count_nodes are the same shape — only the combiner changes (max vs +).",
    complexity: { time: "O(n) — visit every node", space: "O(h) — recursion stack, h = height" },
    code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def preorder(node, out):      # Node, Left, Right  -> [1,2,4,5,3,6]
    if node is None:
        return
    out.append(node.val)
    preorder(node.left, out)
    preorder(node.right, out)

def inorder(node, out):       # Left, Node, Right  -> [4,2,5,1,3,6]
    if node is None:
        return
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)

def postorder(node, out):     # Left, Right, Node  -> [4,5,2,6,3,1]
    if node is None:
        return
    postorder(node.left, out)
    postorder(node.right, out)
    out.append(node.val)

def max_depth(node):          # longest root-to-leaf path
    if node is None:
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))

def contains(node, target):   # is target anywhere?
    if node is None:
        return False
    if node.val == target:
        return True
    return contains(node.left, target) or contains(node.right, target)`,
    recall: [
      "Rewrite preorder / inorder / postorder from a blank file.",
      "Rewrite max_depth and contains; say why they share a shape.",
      "State the time and space complexity out loud.",
    ],
    problems: [
      { title: "Maximum Depth of Binary Tree", lc: 104 },
      { title: "Diameter of Binary Tree", lc: 543 },
      { title: "Lowest Common Ancestor of a Binary Tree", lc: 236 },
    ],
  },
  {
    id: "bfs",
    n: 2,
    title: "BFS / level-order",
    status: "done",
    idea: "Process the tree row by row with a queue (deque). popleft takes from the front, append adds to the back. To group by level, FREEZE the level size before draining it.",
    insight: "level_size = len(queue) at the top of the loop is what separates one level from the next.",
    complexity: { time: "O(n)", space: "O(w) — widest level" },
    code: `from collections import deque

def bfs(root):                # flat level order -> [1,2,3,4,5,6]
    out = []
    if root is None:
        return out
    queue = deque([root])
    while queue:
        node = queue.popleft()        # take from the FRONT
        out.append(node.val)
        if node.left:
            queue.append(node.left)   # children go to the BACK
        if node.right:
            queue.append(node.right)
    return out

def level_order(root):        # grouped -> [[1],[2,3],[4,5,6]]
    out = []
    if root is None:
        return out
    queue = deque([root])
    while queue:
        level_size = len(queue)       # FIRST: queue holds exactly this level
        level = []
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        out.append(level)
    return out`,
    recall: [
      "Rewrite level_order from blank; get the len(queue) freeze right.",
      "Explain why BFS uses a queue and DFS uses a stack.",
    ],
    problems: [
      { title: "Binary Tree Level Order Traversal", lc: 102 },
      { title: "Binary Tree Right Side View", lc: 199 },
      { title: "Rotting Oranges", lc: 994 },
    ],
  },
  {
    id: "iter-dfs",
    n: 3,
    title: "Iterative DFS + nested data",
    status: "done",
    idea: "Recursion made visible with a list as a stack. Push the RIGHT child first so the LEFT child pops first (a stack is last-in-first-out). The same shape as `contains`, generalized to nested dicts/lists with isinstance.",
    insight: "bfs and dfs_iterative are the same loop — queue vs stack. find_in_json is contains with dict/list pieces instead of left/right.",
    complexity: { time: "O(n)", space: "O(h) stack / O(depth) for nested data" },
    code: `def dfs_iterative(root):      # pre-order, no recursion -> [1,2,4,5,3,6]
    out = []
    if root is None:
        return out
    stack = [root]
    while stack:
        node = stack.pop()            # take from the TOP (LIFO)
        out.append(node.val)
        if node.right:
            stack.append(node.right)  # push RIGHT first...
        if node.left:
            stack.append(node.left)   # ...so LEFT pops first
    return out

def find_in_json(data, target):       # search nested data -> True/False
    if data == target:
        return True
    if isinstance(data, dict):
        for value in data.values():
            if find_in_json(value, target):
                return True
    if isinstance(data, list):
        for item in data:
            if find_in_json(item, target):
                return True
    return False`,
    recall: [
      "Rewrite dfs_iterative; remember to push right before left.",
      "Rewrite find_in_json with the dict + list isinstance branches.",
    ],
    problems: [
      { title: "Nested List Weight Sum", lc: 339 },
      { title: "Flatten Nested List Iterator", lc: 341 },
    ],
  },
  {
    id: "graphs",
    n: 4,
    title: "Graphs + visited",
    status: "done",
    idea: "A graph is a tree that can loop; a `visited` set stops infinite loops. The count of components = the number of fresh traversals you have to start.",
    insight: "On a grid, the 4 neighbours are (r±1, c) and (r, c±1); guard bounds and visited before recursing.",
    complexity: { time: "O(V + E) — or O(rows·cols) on a grid", space: "O(V) visited" },
    code: `def num_islands(grid):
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    seen = set()

    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols:
            return
        if grid[r][c] != "1" or (r, c) in seen:
            return
        seen.add((r, c))
        dfs(r + 1, c); dfs(r - 1, c)
        dfs(r, c + 1); dfs(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                count += 1
                dfs(r, c)
    return count`,
    recall: [
      "Rewrite num_islands; the count++ happens once per fresh DFS start.",
      "Explain how `visited` turns the tree traversal into a graph traversal.",
    ],
    problems: [
      { title: "Number of Islands", lc: 200 },
      { title: "Number of Provinces", lc: 547 },
      { title: "Clone Graph", lc: 133 },
      { title: "Course Schedule", lc: 207 },
    ],
  },
  {
    id: "bst",
    n: 5,
    title: "Binary Search Trees",
    status: "next",
    idea: "The ordering rule left < node < right lets you skip half the tree. An in-order traversal of a BST visits values in sorted order — that powers kth-smallest and validation.",
    insight: "Validating a BST needs a (low, high) range carried down — a local left<node<right check is the classic wrong answer.",
    complexity: { time: "O(h) for search, O(n) to validate", space: "O(h)" },
    code: `def is_valid_bst(root):
    def valid(node, low, high):
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return valid(node.left, low, node.val) and valid(node.right, node.val, high)
    return valid(root, float("-inf"), float("inf"))

def kth_smallest(root, k):     # in-order stops at the k-th node
    stack, node = [], root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right`,
    recall: [
      "Rewrite is_valid_bst with the (low, high) bounds.",
      "Rewrite kth_smallest with an in-order stack; stop early at k.",
    ],
    problems: [
      { title: "Validate Binary Search Tree", lc: 98 },
      { title: "Kth Smallest Element in a BST", lc: 230 },
      { title: "Lowest Common Ancestor of a BST", lc: 235 },
    ],
  },
  {
    id: "hashmaps",
    n: 6,
    title: "Hash maps & sets",
    status: "later",
    idea: "Trade memory for O(n) speed: remember what you have seen. Two Sum keeps value→index; prefix-sum counts answer 'how many subarrays sum to k'; Counter answers frequency.",
    insight: "Seed prefix[0] = 1 so subarrays that start at index 0 are counted.",
    complexity: { time: "O(n)", space: "O(n)" },
    code: `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i

def subarray_sum(nums, k):     # count subarrays summing to k
    from collections import defaultdict
    prefix = defaultdict(int)
    prefix[0] = 1
    total = count = 0
    for x in nums:
        total += x
        count += prefix[total - k]
        prefix[total] += 1
    return count`,
    recall: [
      "Rewrite two_sum with the seen-dict in one pass.",
      "Rewrite subarray_sum; explain why prefix[0] = 1.",
    ],
    problems: [
      { title: "Two Sum", lc: 1 },
      { title: "Subarray Sum Equals K", lc: 560 },
      { title: "Group Anagrams", lc: 49 },
    ],
  },
  {
    id: "two-pointers",
    n: 7,
    title: "Two pointers & sliding window",
    status: "later",
    idea: "Two indices over the data avoid nested loops. A sliding window grows on the right and shrinks on the left to track the longest/shortest run that satisfies a condition.",
    insight: "Window template: expand right, while invalid shrink left, then record the answer.",
    complexity: { time: "O(n)", space: "O(1) for two pointers, O(k) for a window of distinct items" },
    code: `def is_palindrome(s):          # two pointers from both ends
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return False
        i += 1
        j -= 1
    return True

def longest_unique(s):         # longest substring without repeats
    seen = set()
    left = best = 0
    for right, ch in enumerate(s):
        while ch in seen:
            seen.remove(s[left])
            left += 1
        seen.add(ch)
        best = max(best, right - left + 1)
    return best`,
    recall: [
      "Rewrite longest_unique with the expand-right / shrink-left window.",
      "Say the window template out loud before coding.",
    ],
    problems: [
      { title: "Valid Palindrome", lc: 125 },
      { title: "Longest Substring Without Repeating Characters", lc: 3 },
      { title: "3Sum", lc: 15 },
    ],
  },
  {
    id: "binary-search-stacks",
    n: 8,
    title: "Binary search & stacks",
    status: "later",
    idea: "Binary search halves a sorted space each step (left ≤ right, mid, move a bound). A monotonic stack answers 'next greater/smaller' by popping while the new element beats the top.",
    insight: "Binary search can run on the ANSWER (e.g. min eating speed), not just an array.",
    complexity: { time: "O(log n) search, O(n) monotonic stack", space: "O(1) / O(n)" },
    code: `def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def daily_temperatures(temps):     # monotonic decreasing stack of indices
    out = [0] * len(temps)
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            out[j] = i - j
        stack.append(i)
    return out`,
    recall: [
      "Rewrite binary_search; get the left<=right and mid±1 bounds right.",
      "Rewrite daily_temperatures; explain the monotonic stack invariant.",
    ],
    problems: [
      { title: "Binary Search", lc: 704 },
      { title: "Search in Rotated Sorted Array", lc: 33 },
      { title: "Daily Temperatures", lc: 739 },
    ],
  },
];

export const PATTERN_STATUS_META = {
  done: { label: "Practiced", tone: "done" },
  next: { label: "Up now", tone: "next" },
  later: { label: "Coming up", tone: "later" },
};
