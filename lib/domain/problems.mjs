// Seed data and starter-code scaffolding for the practice bank: the default
// LeetCode-style problems, descriptions, company tags, learning-store defaults
// and the Python/Java starter-code generators.
import { inferJavaParameterTypes, inferJavaReturnType, javaDefaultReturnLine, sanitizeJavaIdentifier } from "../core/java-types.mjs";
import { clean } from "../core/util.mjs";

const PRACTICE_LANGUAGES = new Set(["python", "java"]);

const seededAt = "2026-05-24T00:00:00.000Z";

const defaultPracticeProblems = [
  {
    id: "lc-two-sum",
    title: "Two Sum",
    slug: "two-sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "twoSum",
    description: "Given an array of integers `nums` and an integer `target`, return *indices of the two numbers such that they add up to `target`*.\n\nYou may assume that each input would have ***exactly* one solution**, and you may not use the *same* element twice.\n\nYou can return the answer in any order.\n\n### Example 1:\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```\n\n### Example 2:\n```\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n```\n\n### Example 3:\n```\nInput: nums = [3,3], target = 6\nOutput: [0,1]\n```\n\n### Constraints:\n- `2 <= nums.length <= 10^4`\n- `-10^9 <= nums[i] <= 10^9`\n- `-10^9 <= target <= 10^9`\n- **Only one valid answer exists.**",
    customTests: [
      { name: "basic pair", args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { name: "same value pair", args: [[3, 3], 6], expected: [0, 1] },
    ],
    draft: "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for index, value in enumerate(nums):\n            need = target - value\n            if need in seen:\n                return [seen[need], index]\n            seen[value] = index\n        return []\n",
  },
  {
    id: "lc-valid-parentheses",
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    url: "https://leetcode.com/problems/valid-parentheses/",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "isValid",
    description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n- Open brackets must be closed by the same type of brackets.\n- Open brackets must be closed in the correct order.\n- Every close bracket has a corresponding open bracket of the same type.\n\n### Example 1:\n```\nInput: s = \"()\"\nOutput: true\n```\n\n### Example 2:\n```\nInput: s = \"()[]{}\"\nOutput: true\n```\n\n### Example 3:\n```\nInput: s = \"(]\"\nOutput: false\n```\n\n### Constraints:\n- `1 <= s.length <= 10^4`\n- `s` consists of parentheses characters only: `'()[]{}'`.",
    customTests: [
      { name: "balanced mixed", args: ["()[]{}"], expected: true },
      { name: "crossed pair", args: ["(]"], expected: false },
    ],
    draft: "class Solution:\n    def isValid(self, s):\n        pairs = {')': '(', ']': '[', '}': '{'}\n        stack = []\n        for char in s:\n            if char in pairs.values():\n                stack.append(char)\n            elif not stack or stack.pop() != pairs.get(char):\n                return False\n        return not stack\n",
  },
  {
    id: "lc-merge-intervals",
    title: "Merge Intervals",
    slug: "merge-intervals",
    url: "https://leetcode.com/problems/merge-intervals/",
    difficulty: "Medium",
    tags: ["Array", "Sorting"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "merge",
    description: "Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return *an array of the non-overlapping intervals that cover all the intervals in the input*.\n\n### Example 1:\n```\nInput: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]\nExplanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].\n```\n\n### Example 2:\n```\nInput: intervals = [[1,4],[4,5]]\nOutput: [[1,5]]\nExplanation: Intervals [1,4] and [4,5] are considered overlapping.\n```\n\n### Constraints:\n- `1 <= intervals.length <= 10^4`\n- `intervals[i].length == 2`\n- `0 <= start_i <= end_i <= 10^4`",
    customTests: [
      { name: "overlap", args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
    ],
    draft: "class Solution:\n    def merge(self, intervals):\n        intervals.sort(key=lambda item: item[0])\n        merged = []\n        for start, end in intervals:\n            if not merged or start > merged[-1][1]:\n                merged.append([start, end])\n            else:\n                merged[-1][1] = max(merged[-1][1], end)\n        return merged\n",
  },
  {
    id: "lc-number-of-islands",
    title: "Number of Islands",
    slug: "number-of-islands",
    url: "https://leetcode.com/problems/number-of-islands/",
    difficulty: "Medium",
    tags: ["Array", "Depth-First Search", "Breadth-First Search", "Matrix"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "numIslands",
    customTests: [
      { name: "single island", args: [[["1", "1", "0"], ["0", "1", "0"], ["0", "0", "1"]]], expected: 2 },
    ],
    draft: "class Solution:\n    def numIslands(self, grid):\n        rows = len(grid)\n        cols = len(grid[0]) if rows else 0\n        seen = set()\n\n        def dfs(r, c):\n            if r < 0 or c < 0 or r >= rows or c >= cols:\n                return\n            if grid[r][c] != '1' or (r, c) in seen:\n                return\n            seen.add((r, c))\n            dfs(r + 1, c)\n            dfs(r - 1, c)\n            dfs(r, c + 1)\n            dfs(r, c - 1)\n\n        count = 0\n        for r in range(rows):\n            for c in range(cols):\n                if grid[r][c] == '1' and (r, c) not in seen:\n                    count += 1\n                    dfs(r, c)\n        return count\n",
  },
  {
    id: "lc-lru-cache",
    title: "LRU Cache",
    slug: "lru-cache",
    url: "https://leetcode.com/problems/lru-cache/",
    difficulty: "Medium",
    tags: ["Hash Table", "Linked List", "Design"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "",
    customTests: [],
    solutionCode: "from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n        self.cache = OrderedDict()\n\n    def get(self, key):\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n\n    def put(self, key, value):\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.capacity:\n            self.cache.popitem(last=False)\n",
    draft: "class LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n\n    def get(self, key):\n        return -1\n\n    def put(self, key, value):\n        pass\n",
  },
  {
    id: "lc-koko-eating-bananas",
    title: "Koko Eating Bananas",
    slug: "koko-eating-bananas",
    url: "https://leetcode.com/problems/koko-eating-bananas/",
    difficulty: "Medium",
    tags: ["Array", "Binary Search"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "minEatingSpeed",
    customTests: [
      { name: "small piles", args: [[3, 6, 7, 11], 8], expected: 4 },
    ],
    draft: "class Solution:\n    def minEatingSpeed(self, piles, h):\n        left, right = 1, max(piles)\n        while left < right:\n            mid = (left + right) // 2\n            hours = sum((pile + mid - 1) // mid for pile in piles)\n            if hours <= h:\n                right = mid\n            else:\n                left = mid + 1\n        return left\n",
  },
  {
    id: "lc-binary-tree-level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    slug: "binary-tree-level-order-traversal",
    url: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
    difficulty: "Medium",
    tags: ["Tree", "Breadth-First Search", "Binary Tree"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "levelOrder",
    customTests: [],
    solutionCode: "from collections import deque\n\nclass Solution:\n    def levelOrder(self, root):\n        if not root:\n            return []\n        result = []\n        queue = deque([root])\n        while queue:\n            level = []\n            for _ in range(len(queue)):\n                node = queue.popleft()\n                level.append(node.val)\n                if node.left:\n                    queue.append(node.left)\n                if node.right:\n                    queue.append(node.right)\n            result.append(level)\n        return result\n",
    draft: "class Solution:\n    def levelOrder(self, root):\n        return []\n",
  },
  {
    id: "lc-course-schedule",
    title: "Course Schedule",
    slug: "course-schedule",
    url: "https://leetcode.com/problems/course-schedule/",
    difficulty: "Medium",
    tags: ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "canFinish",
    customTests: [
      { name: "cycle", args: [2, [[1, 0], [0, 1]]], expected: false },
      { name: "simple chain", args: [2, [[1, 0]]], expected: true },
    ],
    draft: "class Solution:\n    def canFinish(self, numCourses, prerequisites):\n        graph = {course: [] for course in range(numCourses)}\n        for course, prereq in prerequisites:\n            graph[course].append(prereq)\n        visiting = set()\n        visited = set()\n\n        def has_cycle(course):\n            if course in visiting:\n                return True\n            if course in visited:\n                return False\n            visiting.add(course)\n            for prereq in graph[course]:\n                if has_cycle(prereq):\n                    return True\n            visiting.remove(course)\n            visited.add(course)\n            return False\n\n        return not any(has_cycle(course) for course in range(numCourses))\n",
  },
  {
    id: "lc-contains-duplicate",
    title: "Contains Duplicate",
    slug: "contains-duplicate",
    url: "https://leetcode.com/problems/contains-duplicate/",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "containsDuplicate",
    customTests: [
      { name: "has duplicate", args: [[1, 2, 3, 1]], expected: true },
      { name: "all unique", args: [[1, 2, 3, 4]], expected: false },
    ],
    draft: "class Solution:\n    def containsDuplicate(self, nums):\n        return len(nums) != len(set(nums))\n",
  },
  {
    id: "lc-valid-anagram",
    title: "Valid Anagram",
    slug: "valid-anagram",
    url: "https://leetcode.com/problems/valid-anagram/",
    difficulty: "Easy",
    tags: ["Hash Table", "String", "Sorting"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "isAnagram",
    customTests: [
      { name: "anagram", args: ["anagram", "nagaram"], expected: true },
      { name: "different", args: ["rat", "car"], expected: false },
    ],
    draft: "from collections import Counter\n\nclass Solution:\n    def isAnagram(self, s, t):\n        return Counter(s) == Counter(t)\n",
  },
  {
    id: "lc-best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    slug: "best-time-to-buy-and-sell-stock",
    url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    difficulty: "Easy",
    tags: ["Array", "Dynamic Programming"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "maxProfit",
    customTests: [
      { name: "profit exists", args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { name: "descending", args: [[7, 6, 4, 3, 1]], expected: 0 },
    ],
    draft: "class Solution:\n    def maxProfit(self, prices):\n        best_buy = float('inf')\n        best_profit = 0\n        for price in prices:\n            best_buy = min(best_buy, price)\n            best_profit = max(best_profit, price - best_buy)\n        return best_profit\n",
  },
  {
    id: "lc-binary-search",
    title: "Binary Search",
    slug: "binary-search",
    url: "https://leetcode.com/problems/binary-search/",
    difficulty: "Easy",
    tags: ["Array", "Binary Search"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "search",
    customTests: [
      { name: "found", args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { name: "missing", args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
    ],
    draft: "class Solution:\n    def search(self, nums, target):\n        left, right = 0, len(nums) - 1\n        while left <= right:\n            mid = (left + right) // 2\n            if nums[mid] == target:\n                return mid\n            if nums[mid] < target:\n                left = mid + 1\n            else:\n                right = mid - 1\n        return -1\n",
  },
  {
    id: "lc-flood-fill",
    title: "Flood Fill",
    slug: "flood-fill",
    url: "https://leetcode.com/problems/flood-fill/",
    difficulty: "Easy",
    tags: ["Array", "Depth-First Search", "Breadth-First Search", "Matrix"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "floodFill",
    customTests: [
      { name: "fill region", args: [[[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2], expected: [[2, 2, 2], [2, 2, 0], [2, 0, 1]] },
    ],
    draft: "class Solution:\n    def floodFill(self, image, sr, sc, color):\n        original = image[sr][sc]\n        if original == color:\n            return image\n        rows, cols = len(image), len(image[0])\n\n        def dfs(r, c):\n            if r < 0 or c < 0 or r >= rows or c >= cols or image[r][c] != original:\n                return\n            image[r][c] = color\n            dfs(r + 1, c)\n            dfs(r - 1, c)\n            dfs(r, c + 1)\n            dfs(r, c - 1)\n\n        dfs(sr, sc)\n        return image\n",
  },
  {
    id: "lc-invert-binary-tree",
    title: "Invert Binary Tree",
    slug: "invert-binary-tree",
    url: "https://leetcode.com/problems/invert-binary-tree/",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "invertTree",
    customTests: [],
    draft: "class Solution:\n    def invertTree(self, root):\n        if not root:\n            return None\n        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)\n        return root\n",
  },
  {
    id: "lc-longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
    difficulty: "Medium",
    tags: ["Hash Table", "String", "Sliding Window"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "lengthOfLongestSubstring",
    customTests: [
      { name: "abcabcbb", args: ["abcabcbb"], expected: 3 },
      { name: "all same", args: ["bbbbb"], expected: 1 },
    ],
    draft: "class Solution:\n    def lengthOfLongestSubstring(self, s):\n        seen = {}\n        left = 0\n        best = 0\n        for right, char in enumerate(s):\n            if char in seen and seen[char] >= left:\n                left = seen[char] + 1\n            seen[char] = right\n            best = max(best, right - left + 1)\n        return best\n",
  },
  {
    id: "lc-product-of-array-except-self",
    title: "Product of Array Except Self",
    slug: "product-of-array-except-self",
    url: "https://leetcode.com/problems/product-of-array-except-self/",
    difficulty: "Medium",
    tags: ["Array", "Prefix Sum"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "productExceptSelf",
    customTests: [
      { name: "positive", args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { name: "with zero", args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
    ],
    draft: "class Solution:\n    def productExceptSelf(self, nums):\n        result = [1] * len(nums)\n        prefix = 1\n        for i, value in enumerate(nums):\n            result[i] = prefix\n            prefix *= value\n        suffix = 1\n        for i in range(len(nums) - 1, -1, -1):\n            result[i] *= suffix\n            suffix *= nums[i]\n        return result\n",
  },
  {
    id: "lc-top-k-frequent-elements",
    title: "Top K Frequent Elements",
    slug: "top-k-frequent-elements",
    url: "https://leetcode.com/problems/top-k-frequent-elements/",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "Heap", "Bucket Sort"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "topKFrequent",
    customTests: [
      { name: "top two", args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
    ],
    draft: "from collections import Counter\n\nclass Solution:\n    def topKFrequent(self, nums, k):\n        return [num for num, _ in Counter(nums).most_common(k)]\n",
  },
  {
    id: "lc-three-sum",
    title: "3Sum",
    slug: "3sum",
    url: "https://leetcode.com/problems/3sum/",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Sorting"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "threeSum",
    customTests: [
      { name: "mixed", args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]] },
    ],
    draft: "class Solution:\n    def threeSum(self, nums):\n        nums.sort()\n        result = []\n        for i in range(len(nums)):\n            if i > 0 and nums[i] == nums[i - 1]:\n                continue\n            left, right = i + 1, len(nums) - 1\n            while left < right:\n                total = nums[i] + nums[left] + nums[right]\n                if total == 0:\n                    result.append([nums[i], nums[left], nums[right]])\n                    left += 1\n                    right -= 1\n                    while left < right and nums[left] == nums[left - 1]:\n                        left += 1\n                    while left < right and nums[right] == nums[right + 1]:\n                        right -= 1\n                elif total < 0:\n                    left += 1\n                else:\n                    right -= 1\n        return result\n",
  },
  {
    id: "lc-container-with-most-water",
    title: "Container With Most Water",
    slug: "container-with-most-water",
    url: "https://leetcode.com/problems/container-with-most-water/",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Greedy"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "maxArea",
    customTests: [
      { name: "wide container", args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
    ],
    draft: "class Solution:\n    def maxArea(self, height):\n        left, right = 0, len(height) - 1\n        best = 0\n        while left < right:\n            best = max(best, min(height[left], height[right]) * (right - left))\n            if height[left] < height[right]:\n                left += 1\n            else:\n                right -= 1\n        return best\n",
  },
  {
    id: "lc-coin-change",
    title: "Coin Change",
    slug: "coin-change",
    url: "https://leetcode.com/problems/coin-change/",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Breadth-First Search"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "coinChange",
    customTests: [
      { name: "possible", args: [[1, 2, 5], 11], expected: 3 },
      { name: "impossible", args: [[2], 3], expected: -1 },
    ],
    draft: "class Solution:\n    def coinChange(self, coins, amount):\n        dp = [amount + 1] * (amount + 1)\n        dp[0] = 0\n        for total in range(1, amount + 1):\n            for coin in coins:\n                if coin <= total:\n                    dp[total] = min(dp[total], dp[total - coin] + 1)\n        return dp[amount] if dp[amount] <= amount else -1\n",
  },
  {
    id: "lc-rotting-oranges",
    title: "Rotting Oranges",
    slug: "rotting-oranges",
    url: "https://leetcode.com/problems/rotting-oranges/",
    difficulty: "Medium",
    tags: ["Array", "Breadth-First Search", "Matrix"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "orangesRotting",
    customTests: [
      { name: "spreads", args: [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], expected: 4 },
      { name: "blocked", args: [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], expected: -1 },
    ],
    draft: "from collections import deque\n\nclass Solution:\n    def orangesRotting(self, grid):\n        rows, cols = len(grid), len(grid[0])\n        queue = deque()\n        fresh = 0\n        for r in range(rows):\n            for c in range(cols):\n                if grid[r][c] == 2:\n                    queue.append((r, c, 0))\n                elif grid[r][c] == 1:\n                    fresh += 1\n        minutes = 0\n        while queue:\n            r, c, minutes = queue.popleft()\n            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n                nr, nc = r + dr, c + dc\n                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:\n                    grid[nr][nc] = 2\n                    fresh -= 1\n                    queue.append((nr, nc, minutes + 1))\n        return minutes if fresh == 0 else -1\n",
  },
  {
    id: "lc-median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    url: "https://leetcode.com/problems/median-of-two-sorted-arrays/",
    difficulty: "Hard",
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "findMedianSortedArrays",
    customTests: [
      { name: "odd", args: [[1, 3], [2]], expected: 2 },
      { name: "even", args: [[1, 2], [3, 4]], expected: 2.5 },
    ],
    draft: "class Solution:\n    def findMedianSortedArrays(self, nums1, nums2):\n        nums = sorted(nums1 + nums2)\n        n = len(nums)\n        mid = n // 2\n        if n % 2:\n            return nums[mid]\n        return (nums[mid - 1] + nums[mid]) / 2\n",
  },
  {
    id: "lc-trapping-rain-water",
    title: "Trapping Rain Water",
    slug: "trapping-rain-water",
    url: "https://leetcode.com/problems/trapping-rain-water/",
    difficulty: "Hard",
    tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "trap",
    customTests: [
      { name: "classic", args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
    ],
    draft: "class Solution:\n    def trap(self, height):\n        left, right = 0, len(height) - 1\n        left_max = right_max = 0\n        water = 0\n        while left < right:\n            if height[left] < height[right]:\n                left_max = max(left_max, height[left])\n                water += left_max - height[left]\n                left += 1\n            else:\n                right_max = max(right_max, height[right])\n                water += right_max - height[right]\n                right -= 1\n        return water\n",
  },
  {
    id: "lc-word-ladder",
    title: "Word Ladder",
    slug: "word-ladder",
    url: "https://leetcode.com/problems/word-ladder/",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Breadth-First Search"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "ladderLength",
    customTests: [
      { name: "reachable", args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]], expected: 5 },
      { name: "missing end", args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log"]], expected: 0 },
    ],
    draft: "from collections import deque\n\nclass Solution:\n    def ladderLength(self, beginWord, endWord, wordList):\n        words = set(wordList)\n        if endWord not in words:\n            return 0\n        queue = deque([(beginWord, 1)])\n        while queue:\n            word, depth = queue.popleft()\n            if word == endWord:\n                return depth\n            for i in range(len(word)):\n                for code in range(ord('a'), ord('z') + 1):\n                    nxt = word[:i] + chr(code) + word[i + 1:]\n                    if nxt in words:\n                        words.remove(nxt)\n                        queue.append((nxt, depth + 1))\n        return 0\n",
  },
  {
    id: "lc-sliding-window-maximum",
    title: "Sliding Window Maximum",
    slug: "sliding-window-maximum",
    url: "https://leetcode.com/problems/sliding-window-maximum/",
    difficulty: "Hard",
    tags: ["Array", "Queue", "Sliding Window", "Heap", "Monotonic Queue"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "maxSlidingWindow",
    customTests: [
      { name: "window three", args: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
    ],
    draft: "from collections import deque\n\nclass Solution:\n    def maxSlidingWindow(self, nums, k):\n        queue = deque()\n        result = []\n        for i, value in enumerate(nums):\n            while queue and queue[0] <= i - k:\n                queue.popleft()\n            while queue and nums[queue[-1]] <= value:\n                queue.pop()\n            queue.append(i)\n            if i >= k - 1:\n                result.append(nums[queue[0]])\n        return result\n",
  },
  {
    id: "lc-merge-k-sorted-lists",
    title: "Merge k Sorted Lists",
    slug: "merge-k-sorted-lists",
    url: "https://leetcode.com/problems/merge-k-sorted-lists/",
    difficulty: "Hard",
    tags: ["Linked List", "Divide and Conquer", "Heap"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "mergeKLists",
    customTests: [],
    solutionCode: "import heapq\n\nclass Solution:\n    def mergeKLists(self, lists):\n        heap = []\n        for index, node in enumerate(lists):\n            if node:\n                heapq.heappush(heap, (node.val, index, node))\n\n        dummy = ListNode(0)\n        tail = dummy\n        serial = len(lists)\n        while heap:\n            _, _, node = heapq.heappop(heap)\n            tail.next = node\n            tail = tail.next\n            if node.next:\n                serial += 1\n                heapq.heappush(heap, (node.next.val, serial, node.next))\n        tail.next = None\n        return dummy.next\n",
    draft: "class Solution:\n    def mergeKLists(self, lists):\n        # Add a local helper/test harness for ListNode problems when practicing this one.\n        return None\n",
  },
];

const defaultPracticeProblemById = new Map(defaultPracticeProblems.map((problem) => [problem.id, problem]));

const javaPracticeSolutions = {
  "lc-two-sum": `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i += 1) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[] { seen.get(need), i };
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}
`,
  "lc-valid-parentheses": `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Map<Character, Character> pairs = Map.of(')', '(', ']', '[', '}', '{');
        Deque<Character> stack = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if (pairs.containsValue(ch)) {
                stack.push(ch);
            } else if (pairs.containsKey(ch)) {
                if (stack.isEmpty() || stack.pop() != pairs.get(ch)) return false;
            }
        }
        return stack.isEmpty();
    }
}
`,
  "lc-merge-intervals": `import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, Comparator.comparingInt(item -> item[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] interval : intervals) {
            if (merged.isEmpty() || interval[0] > merged.get(merged.size() - 1)[1]) {
                merged.add(new int[] { interval[0], interval[1] });
            } else {
                int[] last = merged.get(merged.size() - 1);
                last[1] = Math.max(last[1], interval[1]);
            }
        }
        return merged.toArray(new int[merged.size()][]);
    }
}
`,
  "lc-number-of-islands": `class Solution {
    public int numIslands(char[][] grid) {
        if (grid == null || grid.length == 0) return 0;
        int islands = 0;
        for (int row = 0; row < grid.length; row += 1) {
            for (int col = 0; col < grid[row].length; col += 1) {
                if (grid[row][col] == '1') {
                    islands += 1;
                    sink(grid, row, col);
                }
            }
        }
        return islands;
    }

    private void sink(char[][] grid, int row, int col) {
        if (row < 0 || col < 0 || row >= grid.length || col >= grid[row].length || grid[row][col] != '1') return;
        grid[row][col] = '0';
        sink(grid, row + 1, col);
        sink(grid, row - 1, col);
        sink(grid, row, col + 1);
        sink(grid, row, col - 1);
    }
}
`,
  "lc-lru-cache": `import java.util.*;

class LRUCache {
    private final int capacity;
    private final LinkedHashMap<Integer, Integer> cache;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.cache = new LinkedHashMap<>(16, 0.75f, true);
    }

    public int get(int key) {
        return cache.getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        cache.put(key, value);
        if (cache.size() > capacity) {
            Integer oldest = cache.keySet().iterator().next();
            cache.remove(oldest);
        }
    }
}
`,
  "lc-koko-eating-bananas": `class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int left = 1;
        int right = 0;
        for (int pile : piles) right = Math.max(right, pile);
        while (left < right) {
            int mid = left + (right - left) / 2;
            long hours = 0;
            for (int pile : piles) hours += (pile + mid - 1L) / mid;
            if (hours <= h) right = mid;
            else left = mid + 1;
        }
        return left;
    }
}
`,
  "lc-binary-tree-level-order-traversal": `import java.util.*;

class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i += 1) {
                TreeNode node = queue.remove();
                level.add(node.val);
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            result.add(level);
        }
        return result;
    }
}
`,
  "lc-course-schedule": `import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numCourses; i += 1) graph.add(new ArrayList<>());
        for (int[] edge : prerequisites) graph.get(edge[0]).add(edge[1]);
        int[] state = new int[numCourses];
        for (int course = 0; course < numCourses; course += 1) {
            if (hasCycle(course, graph, state)) return false;
        }
        return true;
    }

    private boolean hasCycle(int course, List<List<Integer>> graph, int[] state) {
        if (state[course] == 1) return true;
        if (state[course] == 2) return false;
        state[course] = 1;
        for (int prereq : graph.get(course)) {
            if (hasCycle(prereq, graph, state)) return true;
        }
        state[course] = 2;
        return false;
    }
}
`,
  "lc-contains-duplicate": `import java.util.*;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int num : nums) {
            if (!seen.add(num)) return true;
        }
        return false;
    }
}
`,
  "lc-valid-anagram": `class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i += 1) {
            counts[s.charAt(i) - 'a'] += 1;
            counts[t.charAt(i) - 'a'] -= 1;
        }
        for (int count : counts) {
            if (count != 0) return false;
        }
        return true;
    }
}
`,
  "lc-best-time-to-buy-and-sell-stock": `class Solution {
    public int maxProfit(int[] prices) {
        int bestBuy = Integer.MAX_VALUE;
        int bestProfit = 0;
        for (int price : prices) {
            bestBuy = Math.min(bestBuy, price);
            bestProfit = Math.max(bestProfit, price - bestBuy);
        }
        return bestProfit;
    }
}
`,
  "lc-binary-search": `class Solution {
    public int search(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
`,
  "lc-flood-fill": `class Solution {
    public int[][] floodFill(int[][] image, int sr, int sc, int color) {
        int original = image[sr][sc];
        if (original == color) return image;
        fill(image, sr, sc, original, color);
        return image;
    }

    private void fill(int[][] image, int row, int col, int original, int color) {
        if (row < 0 || col < 0 || row >= image.length || col >= image[row].length || image[row][col] != original) return;
        image[row][col] = color;
        fill(image, row + 1, col, original, color);
        fill(image, row - 1, col, original, color);
        fill(image, row, col + 1, original, color);
        fill(image, row, col - 1, original, color);
    }
}
`,
  "lc-invert-binary-tree": `class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode left = invertTree(root.left);
        root.left = invertTree(root.right);
        root.right = left;
        return root;
    }
}
`,
  "lc-longest-substring-without-repeating-characters": `import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> seen = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right += 1) {
            char ch = s.charAt(right);
            if (seen.containsKey(ch) && seen.get(ch) >= left) left = seen.get(ch) + 1;
            seen.put(ch, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`,
  "lc-product-of-array-except-self": `class Solution {
    public int[] productExceptSelf(int[] nums) {
        int[] result = new int[nums.length];
        int prefix = 1;
        for (int i = 0; i < nums.length; i += 1) {
            result[i] = prefix;
            prefix *= nums[i];
        }
        int suffix = 1;
        for (int i = nums.length - 1; i >= 0; i -= 1) {
            result[i] *= suffix;
            suffix *= nums[i];
        }
        return result;
    }
}
`,
  "lc-top-k-frequent-elements": `import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (int num : nums) counts.put(num, counts.getOrDefault(num, 0) + 1);
        PriorityQueue<int[]> heap = new PriorityQueue<>(Comparator.comparingInt(item -> item[1]));
        for (Map.Entry<Integer, Integer> entry : counts.entrySet()) {
            heap.add(new int[] { entry.getKey(), entry.getValue() });
            if (heap.size() > k) heap.remove();
        }
        int[] result = new int[k];
        for (int i = 0; i < k; i += 1) result[i] = heap.remove()[0];
        return result;
    }
}
`,
  "lc-three-sum": `import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> result = new ArrayList<>();
        for (int i = 0; i < nums.length; i += 1) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int left = i + 1;
            int right = nums.length - 1;
            while (left < right) {
                int total = nums[i] + nums[left] + nums[right];
                if (total == 0) {
                    result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                    left += 1;
                    right -= 1;
                    while (left < right && nums[left] == nums[left - 1]) left += 1;
                    while (left < right && nums[right] == nums[right + 1]) right -= 1;
                } else if (total < 0) {
                    left += 1;
                } else {
                    right -= 1;
                }
            }
        }
        return result;
    }
}
`,
  "lc-container-with-most-water": `class Solution {
    public int maxArea(int[] height) {
        int left = 0;
        int right = height.length - 1;
        int best = 0;
        while (left < right) {
            best = Math.max(best, Math.min(height[left], height[right]) * (right - left));
            if (height[left] < height[right]) left += 1;
            else right -= 1;
        }
        return best;
    }
}
`,
  "lc-coin-change": `import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int total = 1; total <= amount; total += 1) {
            for (int coin : coins) {
                if (coin <= total) dp[total] = Math.min(dp[total], dp[total - coin] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
`,
  "lc-rotting-oranges": `import java.util.*;

class Solution {
    public int orangesRotting(int[][] grid) {
        Queue<int[]> queue = new ArrayDeque<>();
        int fresh = 0;
        for (int row = 0; row < grid.length; row += 1) {
            for (int col = 0; col < grid[row].length; col += 1) {
                if (grid[row][col] == 2) queue.add(new int[] { row, col, 0 });
                if (grid[row][col] == 1) fresh += 1;
            }
        }
        int minutes = 0;
        int[][] directions = { {1, 0}, {-1, 0}, {0, 1}, {0, -1} };
        while (!queue.isEmpty()) {
            int[] current = queue.remove();
            minutes = current[2];
            for (int[] direction : directions) {
                int nextRow = current[0] + direction[0];
                int nextCol = current[1] + direction[1];
                if (nextRow < 0 || nextCol < 0 || nextRow >= grid.length || nextCol >= grid[nextRow].length || grid[nextRow][nextCol] != 1) continue;
                grid[nextRow][nextCol] = 2;
                fresh -= 1;
                queue.add(new int[] { nextRow, nextCol, minutes + 1 });
            }
        }
        return fresh == 0 ? minutes : -1;
    }
}
`,
  "lc-median-of-two-sorted-arrays": `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        int total = nums1.length + nums2.length;
        int[] merged = new int[total];
        int i = 0;
        int j = 0;
        int k = 0;
        while (i < nums1.length || j < nums2.length) {
            if (j >= nums2.length || (i < nums1.length && nums1[i] <= nums2[j])) {
                merged[k++] = nums1[i++];
            } else {
                merged[k++] = nums2[j++];
            }
        }
        int mid = total / 2;
        if (total % 2 == 1) return merged[mid];
        return (merged[mid - 1] + merged[mid]) / 2.0;
    }
}
`,
  "lc-trapping-rain-water": `class Solution {
    public int trap(int[] height) {
        int left = 0;
        int right = height.length - 1;
        int leftMax = 0;
        int rightMax = 0;
        int water = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                leftMax = Math.max(leftMax, height[left]);
                water += leftMax - height[left];
                left += 1;
            } else {
                rightMax = Math.max(rightMax, height[right]);
                water += rightMax - height[right];
                right -= 1;
            }
        }
        return water;
    }
}
`,
  "lc-word-ladder": `import java.util.*;

class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> words = new HashSet<>(wordList);
        if (!words.contains(endWord)) return 0;
        Queue<String> queue = new ArrayDeque<>();
        queue.add(beginWord);
        int depth = 1;
        while (!queue.isEmpty()) {
            int size = queue.size();
            for (int i = 0; i < size; i += 1) {
                String word = queue.remove();
                if (word.equals(endWord)) return depth;
                char[] chars = word.toCharArray();
                for (int pos = 0; pos < chars.length; pos += 1) {
                    char original = chars[pos];
                    for (char ch = 'a'; ch <= 'z'; ch += 1) {
                        chars[pos] = ch;
                        String next = new String(chars);
                        if (words.remove(next)) queue.add(next);
                    }
                    chars[pos] = original;
                }
            }
            depth += 1;
        }
        return 0;
    }
}
`,
  "lc-sliding-window-maximum": `import java.util.*;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        Deque<Integer> deque = new ArrayDeque<>();
        int[] result = new int[nums.length - k + 1];
        int out = 0;
        for (int i = 0; i < nums.length; i += 1) {
            while (!deque.isEmpty() && deque.peekFirst() <= i - k) deque.removeFirst();
            while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) deque.removeLast();
            deque.addLast(i);
            if (i >= k - 1) result[out++] = nums[deque.peekFirst()];
        }
        return result;
    }
}
`,
  "lc-merge-k-sorted-lists": `import java.util.*;

class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt(node -> node.val));
        for (ListNode node : lists) {
            if (node != null) heap.add(node);
        }
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (!heap.isEmpty()) {
            ListNode node = heap.remove();
            tail.next = node;
            tail = tail.next;
            if (node.next != null) heap.add(node.next);
        }
        tail.next = null;
        return dummy.next;
    }
}
`,
};

const supplementalPracticeTests = {
  "lc-two-sum": [
    { name: "negative values", args: [[-3, 4, 3, 90], 0], expected: [0, 2] },
    { name: "later pair", args: [[1, 5, 9, 2, 8], 10], expected: [3, 4] },
  ],
  "lc-valid-parentheses": [
    { name: "nested valid", args: ["{[]}"], expected: true },
    { name: "wrong order", args: ["([)]"], expected: false },
    { name: "single opener", args: ["("], expected: false },
  ],
  "lc-merge-intervals": [
    { name: "touching intervals", args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
    { name: "contained interval", args: [[[1, 4], [2, 3]]], expected: [[1, 4]] },
  ],
  "lc-koko-eating-bananas": [
    { name: "large hour budget", args: [[30, 11, 23, 4, 20], 6], expected: 23 },
    { name: "tight hour budget", args: [[30, 11, 23, 4, 20], 5], expected: 30 },
  ],
  "lc-binary-search": [
    { name: "first element", args: [[1, 2, 3, 4], 1], expected: 0 },
    { name: "last element", args: [[1, 2, 3, 4], 4], expected: 3 },
  ],
  "lc-product-of-array-except-self": [
    { name: "two zeros", args: [[0, 4, 0]], expected: [0, 0, 0] },
    { name: "small pair", args: [[2, 3]], expected: [3, 2] },
  ],
  "lc-three-sum": [
    { name: "all zeros", args: [[0, 0, 0, 0]], expected: [[0, 0, 0]] },
    { name: "no triples", args: [[1, 2, -2, -1]], expected: [] },
  ],
  "lc-coin-change": [
    { name: "zero amount", args: [[1], 0], expected: 0 },
    { name: "greedy trap", args: [[1, 3, 4], 6], expected: 2 },
  ],
  "lc-trapping-rain-water": [
    { name: "flat", args: [[1, 1, 1]], expected: 0 },
    { name: "two basins", args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
  ],
  "lc-number-of-islands": [
    { name: "all water", args: [[["0", "0"], ["0", "0"]]], expected: 0 },
    { name: "snake island", args: [[["1", "0", "1"], ["1", "1", "1"]]], expected: 1 },
  ],
  "lc-lru-cache": [
    {
      name: "evicts least recently used key",
      className: "LRUCache",
      operations: ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"],
      operationArgs: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
      expected: [null, null, null, 1, null, -1, null, -1, 3, 4],
    },
  ],
  "lc-binary-tree-level-order-traversal": [
    { name: "three levels", args: [[3, 9, 20, null, null, 15, 7]], argTypes: ["tree"], expected: [[3], [9, 20], [15, 7]] },
    { name: "empty tree", args: [[]], argTypes: ["tree"], expected: [] },
  ],
  "lc-flood-fill": [
    { name: "same color no-op", args: [[[0, 0, 0], [0, 1, 1]], 1, 1, 1], expected: [[0, 0, 0], [0, 1, 1]] },
  ],
  "lc-invert-binary-tree": [
    { name: "balanced tree mirror", args: [[4, 2, 7, 1, 3, 6, 9]], argTypes: ["tree"], expected: [4, 7, 2, 9, 6, 3, 1], expectedType: "tree" },
    { name: "empty tree", args: [[]], argTypes: ["tree"], expected: [], expectedType: "tree" },
  ],
  "lc-rotting-oranges": [
    { name: "already done", args: [[[0, 2]]], expected: 0 },
  ],
  "lc-merge-k-sorted-lists": [
    { name: "three lists", args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], argTypes: ["listnode[]"], expected: [1, 1, 2, 3, 4, 4, 5, 6], expectedType: "listnode" },
    { name: "empty list array", args: [[]], argTypes: ["listnode[]"], expected: [], expectedType: "listnode" },
  ],
};

const practiceProblemDescriptions = {
  "number-of-islands": [
    "### Description",
    "",
    "You are given a rectangular grid of characters where `1` represents land and `0` represents water. Count how many disconnected islands of land exist in the grid.",
    "",
    "An island is formed by land cells connected horizontally or vertically. Diagonal contact does not connect islands.",
    "",
    "### Examples",
    "- Input: grid = [[\"1\",\"1\",\"0\"],[\"0\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]]. Output: 2.",
    "- Input: grid = [[\"1\",\"1\",\"1\"],[\"0\",\"1\",\"0\"],[\"1\",\"0\",\"1\"]]. Output: 3.",
    "",
    "### Constraints",
    "- The grid can be empty.",
    "- Every cell is either `0` or `1`.",
    "- Treat horizontal and vertical neighbors as connected.",
  ].join("\n"),
  "lru-cache": [
    "### Description",
    "",
    "Design a cache with a fixed positive capacity. It must support `get(key)` and `put(key, value)`.",
    "",
    "`get` returns the stored value for a key, or `-1` when the key is not present. `put` inserts or updates a value. When the cache is full, inserting a new key must evict the least recently used key.",
    "",
    "Both reads and writes count as recent use.",
    "",
    "### Example",
    "- Capacity 2. Put `(1,1)`, put `(2,2)`, get `1` returns `1`, put `(3,3)` evicts key `2`, get `2` returns `-1`.",
    "",
    "### Constraints",
    "- Aim for O(1) average time per operation.",
    "- Keys and values are integers.",
  ].join("\n"),
  "koko-eating-bananas": [
    "### Description",
    "",
    "Koko has several piles of bananas and a deadline of `h` hours. Each hour she chooses one pile and eats up to `k` bananas from it. If a pile has fewer than `k` bananas, she finishes that pile and stops for the hour.",
    "",
    "Return the smallest integer speed `k` that lets her finish all piles within `h` hours.",
    "",
    "### Examples",
    "- Input: piles = [3,6,7,11], h = 8. Output: 4.",
    "- Input: piles = [30,11,23,4,20], h = 5. Output: 30.",
    "",
    "### Constraints",
    "- `piles` contains positive integers.",
    "- `h` is at least the number of piles.",
  ].join("\n"),
  "binary-tree-level-order-traversal": [
    "### Description",
    "",
    "Given the root of a binary tree, return the node values grouped by depth from top to bottom.",
    "",
    "Values in each group should appear from left to right.",
    "",
    "### Example",
    "- Tree `[3,9,20,null,null,15,7]` returns `[[3],[9,20],[15,7]]`.",
    "",
    "### Constraints",
    "- The tree may be empty.",
    "- Preserve left-to-right order inside each level.",
  ].join("\n"),
  "course-schedule": [
    "### Description",
    "",
    "There are `numCourses` courses labeled from `0` to `numCourses - 1`. Each prerequisite pair `[a, b]` means course `b` must be completed before course `a`.",
    "",
    "Return `true` if it is possible to finish all courses, otherwise return `false`.",
    "",
    "### Examples",
    "- Input: numCourses = 2, prerequisites = [[1,0]]. Output: true.",
    "- Input: numCourses = 2, prerequisites = [[1,0],[0,1]]. Output: false.",
    "",
    "### Constraints",
    "- Course labels are valid integers in range.",
    "- Cycles make completion impossible.",
  ].join("\n"),
  "contains-duplicate": [
    "### Description",
    "",
    "Given an integer array `nums`, return `true` if any value appears at least twice. Return `false` when every value is unique.",
    "",
    "### Examples",
    "- Input: nums = [1,2,3,1]. Output: true.",
    "- Input: nums = [1,2,3,4]. Output: false.",
    "",
    "### Constraints",
    "- The array may contain negative, zero, or positive integers.",
  ].join("\n"),
  "valid-anagram": [
    "### Description",
    "",
    "Given two strings `s` and `t`, determine whether `t` is an anagram of `s`.",
    "",
    "Two strings are anagrams when they use the same characters with the same counts, possibly in a different order.",
    "",
    "### Examples",
    "- Input: s = `anagram`, t = `nagaram`. Output: true.",
    "- Input: s = `rat`, t = `car`. Output: false.",
    "",
    "### Constraints",
    "- Strings contain lowercase English letters in the standard version.",
  ].join("\n"),
  "best-time-to-buy-and-sell-stock": [
    "### Description",
    "",
    "Given daily stock prices, choose one day to buy and a later day to sell. Return the maximum possible profit.",
    "",
    "If no profitable trade exists, return `0`.",
    "",
    "### Examples",
    "- Input: prices = [7,1,5,3,6,4]. Output: 5.",
    "- Input: prices = [7,6,4,3,1]. Output: 0.",
    "",
    "### Constraints",
    "- You may complete at most one buy and one sell.",
    "- The sell day must be after the buy day.",
  ].join("\n"),
  "binary-search": [
    "### Description",
    "",
    "Given a sorted integer array `nums` and a `target`, return the index of the target. If the target does not exist, return `-1`.",
    "",
    "### Examples",
    "- Input: nums = [-1,0,3,5,9,12], target = 9. Output: 4.",
    "- Input: nums = [-1,0,3,5,9,12], target = 2. Output: -1.",
    "",
    "### Constraints",
    "- `nums` is sorted in ascending order.",
    "- Aim for O(log n) time.",
  ].join("\n"),
  "flood-fill": [
    "### Description",
    "",
    "Given an image represented as a grid of colors, a starting row `sr`, a starting column `sc`, and a replacement `color`, recolor the starting pixel and every connected pixel with the same original color.",
    "",
    "Connectivity is horizontal and vertical only.",
    "",
    "### Example",
    "- Input: image = [[1,1,1],[1,1,0],[1,0,1]], sr = 1, sc = 1, color = 2. Output: [[2,2,2],[2,2,0],[2,0,1]].",
    "",
    "### Constraints",
    "- The image has at least one row and one column.",
    "- Only pixels matching the original starting color are recolored.",
  ].join("\n"),
  "invert-binary-tree": [
    "### Description",
    "",
    "Given the root of a binary tree, invert the tree by swapping every node's left and right children. Return the root of the inverted tree.",
    "",
    "### Example",
    "- Tree `[4,2,7,1,3,6,9]` becomes `[4,7,2,9,6,3,1]`.",
    "",
    "### Constraints",
    "- The tree may be empty.",
    "- Every node should be mirrored exactly once.",
  ].join("\n"),
  "longest-substring-without-repeating-characters": [
    "### Description",
    "",
    "Given a string `s`, return the length of the longest contiguous substring that contains no repeated characters.",
    "",
    "### Examples",
    "- Input: s = `abcabcbb`. Output: 3.",
    "- Input: s = `bbbbb`. Output: 1.",
    "- Input: s = `pwwkew`. Output: 3.",
    "",
    "### Constraints",
    "- The substring must be contiguous.",
    "- Characters may include letters, digits, symbols, and spaces.",
  ].join("\n"),
  "product-of-array-except-self": [
    "### Description",
    "",
    "Given an integer array `nums`, return an array where each position contains the product of every input value except the value at that same position.",
    "",
    "Solve it without using division.",
    "",
    "### Examples",
    "- Input: nums = [1,2,3,4]. Output: [24,12,8,6].",
    "- Input: nums = [-1,1,0,-3,3]. Output: [0,0,9,0,0].",
    "",
    "### Constraints",
    "- Aim for O(n) time.",
    "- The output array does not count as extra space for the standard follow-up.",
  ].join("\n"),
  "top-k-frequent-elements": [
    "### Description",
    "",
    "Given an integer array `nums` and an integer `k`, return the `k` values that appear most frequently.",
    "",
    "The answer can be returned in any order.",
    "",
    "### Examples",
    "- Input: nums = [1,1,1,2,2,3], k = 2. Output: [1,2].",
    "- Input: nums = [1], k = 1. Output: [1].",
    "",
    "### Constraints",
    "- `k` is between 1 and the number of unique values.",
    "- Prefer better than O(n log n) when possible.",
  ].join("\n"),
  "3sum": [
    "### Description",
    "",
    "Given an integer array `nums`, return all unique triplets `[a, b, c]` such that `a + b + c == 0`.",
    "",
    "The same array element cannot be reused within a triplet. Do not return duplicate triplets.",
    "",
    "### Examples",
    "- Input: nums = [-1,0,1,2,-1,-4]. Output: [[-1,-1,2],[-1,0,1]].",
    "- Input: nums = [0,0,0]. Output: [[0,0,0]].",
    "",
    "### Constraints",
    "- Triplets may be returned in any order.",
    "- Duplicate input values are allowed.",
  ].join("\n"),
  "container-with-most-water": [
    "### Description",
    "",
    "You are given an array where each value represents the height of a vertical line. Choose two lines that, together with the x-axis, can hold the most water.",
    "",
    "Return the maximum area.",
    "",
    "### Example",
    "- Input: height = [1,8,6,2,5,4,8,3,7]. Output: 49.",
    "",
    "### Constraints",
    "- Width is the distance between the two chosen indices.",
    "- Area is limited by the shorter chosen line.",
  ].join("\n"),
  "coin-change": [
    "### Description",
    "",
    "Given coin denominations and a target `amount`, return the fewest coins needed to make exactly that amount.",
    "",
    "Return `-1` if the amount cannot be formed.",
    "",
    "### Examples",
    "- Input: coins = [1,2,5], amount = 11. Output: 3.",
    "- Input: coins = [2], amount = 3. Output: -1.",
    "",
    "### Constraints",
    "- You may use each denomination unlimited times.",
    "- `amount` may be zero.",
  ].join("\n"),
  "rotting-oranges": [
    "### Description",
    "",
    "A grid contains empty cells, fresh oranges, and rotten oranges. Every minute, a rotten orange makes each adjacent fresh orange rotten.",
    "",
    "Return the minimum minutes needed until no fresh oranges remain, or `-1` if some fresh orange can never rot.",
    "",
    "### Examples",
    "- Input: grid = [[2,1,1],[1,1,0],[0,1,1]]. Output: 4.",
    "- Input: grid = [[2,1,1],[0,1,1],[1,0,1]]. Output: -1.",
    "",
    "### Constraints",
    "- Adjacent means up, down, left, or right.",
    "- Cells use `0` for empty, `1` for fresh, and `2` for rotten.",
  ].join("\n"),
  "median-of-two-sorted-arrays": [
    "### Description",
    "",
    "Given two sorted arrays `nums1` and `nums2`, return the median value of the combined sorted data.",
    "",
    "The arrays should not need to be fully merged for the intended optimal solution.",
    "",
    "### Examples",
    "- Input: nums1 = [1,3], nums2 = [2]. Output: 2.",
    "- Input: nums1 = [1,2], nums2 = [3,4]. Output: 2.5.",
    "",
    "### Constraints",
    "- At least one of the arrays is non-empty.",
    "- The intended time target is O(log(m+n)).",
  ].join("\n"),
  "trapping-rain-water": [
    "### Description",
    "",
    "Given an elevation map represented by bar heights, compute how much rain water can be trapped after raining.",
    "",
    "Water above a position is limited by the tallest boundary to its left and right.",
    "",
    "### Examples",
    "- Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]. Output: 6.",
    "- Input: height = [4,2,0,3,2,5]. Output: 9.",
    "",
    "### Constraints",
    "- Heights are non-negative integers.",
    "- Return the total units of trapped water.",
  ].join("\n"),
  "word-ladder": [
    "### Description",
    "",
    "Given a `beginWord`, an `endWord`, and a dictionary, return the length of the shortest transformation sequence from begin to end.",
    "",
    "Each step changes exactly one character, and every intermediate word must exist in the dictionary. If no sequence exists, return `0`.",
    "",
    "### Examples",
    "- Input: beginWord = `hit`, endWord = `cog`, wordList = [`hot`,`dot`,`dog`,`lot`,`log`,`cog`]. Output: 5.",
    "- Input: beginWord = `hit`, endWord = `cog`, wordList = [`hot`,`dot`,`dog`,`lot`,`log`]. Output: 0.",
    "",
    "### Constraints",
    "- All words have the same length.",
    "- Each transformed word must be in `wordList`, except the starting word.",
  ].join("\n"),
  "sliding-window-maximum": [
    "### Description",
    "",
    "Given an integer array `nums` and window size `k`, return the maximum value in each contiguous window of length `k` as it slides from left to right.",
    "",
    "### Example",
    "- Input: nums = [1,3,-1,-3,5,3,6,7], k = 3. Output: [3,3,5,5,6,7].",
    "",
    "### Constraints",
    "- `k` is at least 1 and at most `nums.length`.",
    "- Aim for O(n) time with a monotonic queue.",
  ].join("\n"),
  "merge-k-sorted-lists": [
    "### Description",
    "",
    "Given an array of linked-list heads, where each linked list is sorted in ascending order, merge all lists into one sorted linked list and return its head.",
    "",
    "### Example",
    "- Input: lists = [[1,4,5],[1,3,4],[2,6]]. Output: [1,1,2,3,4,4,5,6].",
    "",
    "### Constraints",
    "- The list array may be empty.",
    "- Individual lists may be empty.",
    "- Preserve sorted order in the merged result.",
  ].join("\n"),
};

defaultPracticeProblems.forEach((problem) => {
  const solutionCode = String(problem.solutionCode || problem.draft || "");
  problem.description = String(problem.description || practiceProblemDescriptions[problem.slug] || "");
  problem.solutionCode = solutionCode;
  problem.starterCode = String(problem.starterCode || makeStarterCode(problem));
  problem.draft = problem.starterCode;
  problem.userStarted = false;
});

// Curated company tag map keyed by slug. Source: publicly known patterns from
// NeetCode frequency lists, Blind 75, and Glassdoor / Blind interview reports.
// Kept static + offline so the cockpit works without API access.
const practiceCompanyTags = {
  "two-sum": ["Amazon", "Google", "Apple", "Microsoft", "Adobe"],
  "3sum": ["Amazon", "Adobe", "Facebook", "Microsoft"],
  "contains-duplicate": ["Amazon", "Apple", "Microsoft"],
  "valid-anagram": ["Amazon", "Apple", "Bloomberg", "Uber"],
  "top-k-frequent-elements": ["Amazon", "Facebook", "Yelp", "Uber"],
  "product-of-array-except-self": ["Amazon", "Facebook", "Microsoft", "Apple", "Lyft"],
  "valid-parentheses": ["Amazon", "Google", "Microsoft", "Facebook", "Bloomberg"],
  "merge-intervals": ["Amazon", "Facebook", "Google", "Microsoft", "Bloomberg"],
  "longest-substring-without-repeating-characters": ["Amazon", "Adobe", "Bloomberg", "Facebook", "Apple"],
  "container-with-most-water": ["Amazon", "Facebook", "Bloomberg", "Adobe"],
  "trapping-rain-water": ["Amazon", "Google", "Apple", "Facebook", "Goldman Sachs"],
  "best-time-to-buy-and-sell-stock": ["Amazon", "Facebook", "Microsoft", "Adobe", "Bloomberg"],
  "binary-search": ["Amazon", "Microsoft", "Google", "Apple"],
  "koko-eating-bananas": ["Google", "Facebook"],
  "median-of-two-sorted-arrays": ["Amazon", "Google", "Apple", "Microsoft", "Adobe"],
  "coin-change": ["Amazon", "Google", "Uber", "Goldman Sachs"],
  "invert-binary-tree": ["Google", "Amazon", "Apple"],
  "binary-tree-level-order-traversal": ["Amazon", "Bloomberg", "Facebook", "Microsoft", "LinkedIn"],
  "number-of-islands": ["Amazon", "Facebook", "Google", "Bloomberg", "Microsoft"],
  "flood-fill": ["Amazon", "Microsoft"],
  "rotting-oranges": ["Amazon", "Google"],
  "course-schedule": ["Amazon", "Google", "Facebook", "Apple"],
  "merge-k-sorted-lists": ["Amazon", "Google", "Facebook", "Microsoft", "Bloomberg", "Uber"],
  "sliding-window-maximum": ["Amazon", "Google", "Microsoft"],
  "word-ladder": ["Amazon", "Facebook", "Google", "LinkedIn"],
  "lru-cache": ["Amazon", "Google", "Microsoft", "Apple", "Facebook", "Bloomberg"],
};

function getCompanyTagsForProblem(slug) {
  return practiceCompanyTags[slug] || [];
}

const defaultPracticeStore = {
  version: 1,
  settings: {
    timezone: "America/Vancouver",
    dailyReviewTime: "20:00",
    reviewMinutes: 45,
  },
  problems: defaultPracticeProblems,
};

const defaultCoursesStore = {
  version: 1,
  items: [
    {
      id: "course-dsa-patterns",
      title: "DSA Patterns",
      track: "Algorithms",
      status: "Not Started",
      progress: 0,
      modules: ["Two pointers", "Sliding window", "Binary search", "BFS/DFS", "Graphs", "Dynamic programming"],
      resources: ["NeetCode roadmap", "Blind 75", "LeetCode pattern notes"],
      notes: "",
      lastStudiedAt: "",
      nextReviewAt: "",
    },
    {
      id: "course-python-interview-prep",
      title: "Python Interview Prep",
      track: "Language",
      status: "Not Started",
      progress: 0,
      modules: ["Collections", "Heapq", "Itertools", "Typing", "Testing snippets", "Runtime tradeoffs"],
      resources: ["Python docs", "Personal snippet bank"],
      notes: "",
      lastStudiedAt: "",
      nextReviewAt: "",
    },
    {
      id: "course-backend-platform-prep",
      title: "Backend / Platform Prep",
      track: "Backend",
      status: "Not Started",
      progress: 0,
      modules: ["APIs", "PostgreSQL", "AWS serverless", "CI/CD", "Reliability", "Incident response"],
      resources: ["Architecture notes", "AWS Well-Architected", "PostgreSQL docs"],
      notes: "",
      lastStudiedAt: "",
      nextReviewAt: "",
    },
    {
      id: "course-system-design-fundamentals",
      title: "System Design Fundamentals",
      track: "System Design",
      status: "Not Started",
      progress: 0,
      modules: ["Capacity estimates", "APIs", "Data model", "Caching", "Queues", "Observability"],
      resources: ["Design prompt checklist", "Personal diagrams"],
      notes: "",
      lastStudiedAt: "",
      nextReviewAt: "",
    },
    {
      id: "course-advanced-system-design",
      title: "Advanced System Design",
      track: "System Design",
      status: "Not Started",
      progress: 0,
      modules: ["Multi-region", "Consistency", "Sharding", "Search", "Realtime systems", "Incident strategy"],
      resources: ["Company engineering blogs", "Personal postmortem notes"],
      notes: "",
      lastStudiedAt: "",
      nextReviewAt: "",
    },
    {
      id: "course-behavioral-strategy",
      title: "Behavioral Strategy",
      track: "Interviewing",
      status: "Not Started",
      progress: 0,
      modules: ["Leadership stories", "Conflict", "Execution", "Technical ownership", "Remote collaboration"],
      resources: ["STAR story bank", "Recruiter screen notes"],
      notes: "",
      lastStudiedAt: "",
      nextReviewAt: "",
    },
  ],
};

const defaultSystemDesignStore = {
  version: 1,
  topics: [
    "APIs",
    "Caching",
    "Queues",
    "Databases",
    "Scaling",
    "Consistency",
    "Observability",
    "Rate Limiting",
    "Authentication",
    "Search",
    "Chat",
    "Feeds",
    "Payments",
    "Multi-region",
    "Incidents",
  ].map((title) => ({
    id: `sd-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    status: "Not Started",
    confidence: 1,
    prompts: [],
    checklist: ["Requirements", "APIs", "Data model", "Scale", "Failure modes", "Tradeoffs"],
    notes: "",
    diagramLinks: "",
    practiceHistory: [],
    lastPracticedAt: "",
    nextReviewAt: "",
  })),
};

function normalizePracticeLanguage(value) {
  const language = clean(value).toLowerCase();
  return PRACTICE_LANGUAGES.has(language) ? language : "python";
}

function makeStarterCode(problem = {}, language = "python") {
  if (normalizePracticeLanguage(language) === "java") return makeJavaStarterCode(problem);
  const methodName = clean(problem.methodName);
  const title = clean(problem.title);
  if (!methodName && /lru cache/i.test(title)) {
    return "class LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass\n";
  }
  if (!methodName) {
    return "class Solution:\n    def solve(self):\n        pass\n";
  }
  return `class Solution:\n    def ${methodName}(self, *args):\n        pass\n`;
}

function makeJavaStarterCode(problem = {}) {
  const methodName = clean(problem.methodName);
  const title = clean(problem.title);
  const tests = Array.isArray(problem.customTests) ? problem.customTests : [];
  if (!methodName && /lru cache/i.test(title)) {
    return [
      "import java.util.*;",
      "",
      "class LRUCache {",
      "    public LRUCache(int capacity) {",
      "    }",
      "",
      "    public int get(int key) {",
      "        return -1;",
      "    }",
      "",
      "    public void put(int key, int value) {",
      "    }",
      "}",
      "",
    ].join("\n");
  }
  if (!methodName) {
    return [
      "import java.util.*;",
      "",
      "class Solution {",
      "    public Object solve() {",
      "        return null;",
      "    }",
      "}",
      "",
    ].join("\n");
  }
  const sample = tests.find((test) => Array.isArray(test.args)) || {};
  const parameterTypes = inferJavaParameterTypes({ ...problem, customTests: tests });
  const params = parameterTypes.map((type, index) => `${type} arg${index + 1}`);
  const safeMethodName = sanitizeJavaIdentifier(methodName, "solve");
  const returnType = inferJavaReturnType(sample.expected, sample.expectedType, problem);
  const returnLine = javaDefaultReturnLine(returnType);
  return [
    "import java.util.*;",
    "",
    "class Solution {",
    `    public ${returnType} ${safeMethodName}(${params.join(", ")}) {`,
    `        ${returnLine}`,
    "    }",
    "}",
    "",
  ].join("\n");
}

export {
  PRACTICE_LANGUAGES,
  seededAt,
  defaultPracticeProblems,
  defaultPracticeProblemById,
  javaPracticeSolutions,
  supplementalPracticeTests,
  practiceProblemDescriptions,
  practiceCompanyTags,
  getCompanyTagsForProblem,
  defaultPracticeStore,
  defaultCoursesStore,
  defaultSystemDesignStore,
  normalizePracticeLanguage,
  makeStarterCode,
  makeJavaStarterCode,
};
