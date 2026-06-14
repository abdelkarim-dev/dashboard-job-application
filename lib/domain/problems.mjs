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
  // ---- Tier 1-3 roadmap problems (authored + runner-verified) ----
  {
    id: "lc-group-anagrams",
    title: "Group Anagrams",
    slug: "group-anagrams",
    url: "https://leetcode.com/problems/group-anagrams/",
    difficulty: "Medium",
    tags: ["Array","Hash Table","String","Sorting"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "groupAnagrams",
    description: "Given an array of strings `strs`, group the anagrams together. You can return the answer in **any order**.\n\nAn **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.\n\n### Example 1:\n```\nInput: strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]\nOutput: [[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]\nExplanation:\n- There is no string in strs that can be rearranged to form \"bat\".\n- The strings \"nat\" and \"tan\" are anagrams as they can be rearranged to form each other.\n- The strings \"ate\", \"eat\", and \"tea\" are anagrams as they can be rearranged to form each other.\n```\n\n### Example 2:\n```\nInput: strs = [\"\"]\nOutput: [[\"\"]]\n```\n\n### Example 3:\n```\nInput: strs = [\"a\"]\nOutput: [[\"a\"]]\n```\n\n### Constraints:\n- `1 <= strs.length <= 10^4`\n- `0 <= strs[i].length <= 100`\n- `strs[i]` consists of lowercase English letters.\n\n**Note:** The order of the groups and the order of strings within a group do not matter.",
    customTests: [{"name":"classic three groups","args":[["eat","tea","tan","ate","nat","bat"]],"expected":[["ate","eat","tea"],["bat"],["nat","tan"]],"validator":"unorderedDeepNestedList"},{"name":"single word","args":[["a"]],"expected":[["a"]],"validator":"unorderedDeepNestedList"},{"name":"all anagrams of each other","args":[["abc","bca","cab","cba"]],"expected":[["abc","bca","cab","cba"]],"validator":"unorderedDeepNestedList"},{"name":"no shared anagrams","args":[["dog","cat","bird"]],"expected":[["bird"],["cat"],["dog"]],"validator":"unorderedDeepNestedList"},{"name":"duplicate words stay together","args":[["ab","ba","ab"]],"expected":[["ab","ab","ba"]],"validator":"unorderedDeepNestedList"}],
    draft: "class Solution:\n    def groupAnagrams(self, strs):\n        # TODO: group the strings that are anagrams of one another.\n        # Return a list of groups; order does not matter.\n        pass\n",
    solutionCode: "from collections import defaultdict\n\nclass Solution:\n    def groupAnagrams(self, strs):\n        groups = defaultdict(list)\n        for word in strs:\n            key = tuple(sorted(word))\n            groups[key].append(word)\n        return list(groups.values())\n",
    languageSolutions: { python: "from collections import defaultdict\n\nclass Solution:\n    def groupAnagrams(self, strs):\n        groups = defaultdict(list)\n        for word in strs:\n            key = tuple(sorted(word))\n            groups[key].append(word)\n        return list(groups.values())\n", java: "import java.util.*;\n\nclass Solution {\n    public List<List<String>> groupAnagrams(List<String> strs) {\n        Map<String, List<String>> groups = new HashMap<>();\n        for (String word : strs) {\n            char[] chars = word.toCharArray();\n            Arrays.sort(chars);\n            String key = new String(chars);\n            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word);\n        }\n        return new ArrayList<>(groups.values());\n    }\n}\n" },
  },
  {
    id: "lc-valid-palindrome",
    title: "Valid Palindrome",
    slug: "valid-palindrome",
    url: "https://leetcode.com/problems/valid-palindrome/",
    difficulty: "Easy",
    tags: ["Two Pointers","String"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "isPalindrome",
    description: "A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` *if it is a palindrome, or* `false` *otherwise*.\n\n### Example 1:\n```\nInput: s = \"A man, a plan, a canal: Panama\"\nOutput: true\nExplanation: \"amanaplanacanalpanama\" is a palindrome.\n```\n\n### Example 2:\n```\nInput: s = \"race a car\"\nOutput: false\nExplanation: \"raceacar\" is not a palindrome.\n```\n\n### Example 3:\n```\nInput: s = \" \"\nOutput: true\nExplanation: s is an empty string \"\" after removing non-alphanumeric characters.\nSince an empty string reads the same forward and backward, it is a palindrome.\n```\n\n### Constraints:\n- `1 <= s.length <= 2 * 10^5`\n- `s` consists only of printable ASCII characters.",
    customTests: [{"name":"alphanumeric with punctuation","args":["A man, a plan, a canal: Panama"],"expected":true},{"name":"not a palindrome","args":["race a car"],"expected":false},{"name":"only non-alphanumeric chars","args":[" "],"expected":true},{"name":"empty string","args":[""],"expected":true},{"name":"mixed letter-digit not palindrome","args":["0P"],"expected":false},{"name":"underscore ignored palindrome","args":["ab_a"],"expected":true}],
    draft: "class Solution:\n    def isPalindrome(self, s):\n        # TODO: return True if s is a palindrome considering only\n        # alphanumeric characters and ignoring case, else False.\n        pass\n",
    solutionCode: "class Solution:\n    def isPalindrome(self, s):\n        left, right = 0, len(s) - 1\n        while left < right:\n            while left < right and not s[left].isalnum():\n                left += 1\n            while left < right and not s[right].isalnum():\n                right -= 1\n            if s[left].lower() != s[right].lower():\n                return False\n            left += 1\n            right -= 1\n        return True\n",
    languageSolutions: { python: "class Solution:\n    def isPalindrome(self, s):\n        left, right = 0, len(s) - 1\n        while left < right:\n            while left < right and not s[left].isalnum():\n                left += 1\n            while left < right and not s[right].isalnum():\n                right -= 1\n            if s[left].lower() != s[right].lower():\n                return False\n            left += 1\n            right -= 1\n        return True\n", java: "class Solution {\n    public boolean isPalindrome(String s) {\n        int left = 0, right = s.length() - 1;\n        while (left < right) {\n            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;\n            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;\n            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {\n                return false;\n            }\n            left++;\n            right--;\n        }\n        return true;\n    }\n}\n" },
  },
  {
    id: "lc-two-sum-ii",
    title: "Two Sum II - Input Array Is Sorted",
    slug: "two-sum-ii-input-array-is-sorted",
    url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
    difficulty: "Medium",
    tags: ["Array","Two Pointers","Binary Search"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "twoSum",
    description: "Given a **1-indexed** array of integers `numbers` that is already sorted in **non-decreasing order**, find two numbers such that they add up to a specific `target` number. Let these two numbers be `numbers[index1]` and `numbers[index2]` where `1 <= index1 < index2 <= numbers.length`.\n\nReturn *the indices of the two numbers, `index1` and `index2`, **added by one** as an integer array `[index1, index2]` of length 2.*\n\nThe tests are generated such that there is **exactly one solution**. You **may not** use the same element twice.\n\nYour solution must use only constant extra space.\n\n### Example 1:\n```\nInput: numbers = [2,7,11,15], target = 9\nOutput: [1,2]\nExplanation: The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2. We return [1, 2].\n```\n\n### Example 2:\n```\nInput: numbers = [2,3,4], target = 6\nOutput: [1,3]\nExplanation: The sum of 2 and 4 is 6. Therefore index1 = 1, index2 = 3. We return [1, 3].\n```\n\n### Example 3:\n```\nInput: numbers = [-1,0], target = -1\nOutput: [1,2]\nExplanation: The sum of -1 and 0 is -1. Therefore index1 = 1, index2 = 2. We return [1, 2].\n```\n\n### Constraints:\n- `2 <= numbers.length <= 3 * 10^4`\n- `-1000 <= numbers[i] <= 1000`\n- `numbers` is sorted in **non-decreasing order**.\n- `-1000 <= target <= 1000`\n- The tests are generated such that there is **exactly one solution**.",
    customTests: [{"name":"classic example","args":[[2,7,11,15],9],"expected":[1,2]},{"name":"middle pair","args":[[2,3,4],6],"expected":[1,3]},{"name":"two negatives","args":[[-1,0],-1],"expected":[1,2]},{"name":"first and last","args":[[1,2,3,4,5],6],"expected":[1,5]},{"name":"leading duplicate values","args":[[0,0,3,4],0],"expected":[1,2]},{"name":"ends of array","args":[[5,25,75],100],"expected":[2,3]}],
    draft: "class Solution:\n    def twoSum(self, numbers, target):\n        # TODO: return 1-indexed [index1, index2] of the two numbers summing to target\n        pass\n",
    solutionCode: "class Solution:\n    def twoSum(self, numbers, target):\n        lo, hi = 0, len(numbers) - 1\n        while lo < hi:\n            total = numbers[lo] + numbers[hi]\n            if total == target:\n                return [lo + 1, hi + 1]\n            if total < target:\n                lo += 1\n            else:\n                hi -= 1\n        return []\n",
    languageSolutions: { python: "class Solution:\n    def twoSum(self, numbers, target):\n        lo, hi = 0, len(numbers) - 1\n        while lo < hi:\n            total = numbers[lo] + numbers[hi]\n            if total == target:\n                return [lo + 1, hi + 1]\n            if total < target:\n                lo += 1\n            else:\n                hi -= 1\n        return []\n", java: "class Solution {\n    public int[] twoSum(int[] numbers, int target) {\n        int lo = 0, hi = numbers.length - 1;\n        while (lo < hi) {\n            int total = numbers[lo] + numbers[hi];\n            if (total == target) {\n                return new int[]{lo + 1, hi + 1};\n            }\n            if (total < target) {\n                lo++;\n            } else {\n                hi--;\n            }\n        }\n        return new int[]{};\n    }\n}\n" },
  },
  {
    id: "lc-longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    slug: "longest-repeating-character-replacement",
    url: "https://leetcode.com/problems/longest-repeating-character-replacement/",
    difficulty: "Medium",
    tags: ["Hash Table","String","Sliding Window"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "characterReplacement",
    description: "You are given a string `s` and an integer `k`. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation **at most `k` times**.\n\nReturn *the length of the longest substring containing the same letter you can get after performing the above operations*.\n\n### Example 1:\n```\nInput: s = \"ABAB\", k = 2\nOutput: 4\nExplanation: Replace the two 'A's with two 'B's or vice versa.\n```\n\n### Example 2:\n```\nInput: s = \"AABABBA\", k = 1\nOutput: 4\nExplanation: Replace the one 'A' in the middle with 'B' and form \"AABBBBA\".\nThe substring \"BBBB\" has the longest repeating letters, which is 4.\nThere may exist other ways to achieve this answer too.\n```\n\n### Example 3:\n```\nInput: s = \"ABCDE\", k = 0\nOutput: 1\nExplanation: With no replacements allowed, the best you can do is a single character.\n```\n\n### Constraints:\n- `1 <= s.length <= 10^5`\n- `s` consists of only uppercase English letters.\n- `0 <= k <= s.length`",
    customTests: [{"name":"classic ABAB","args":["ABAB",2],"expected":4},{"name":"AABABBA k=1","args":["AABABBA",1],"expected":4},{"name":"no replacements all same","args":["AAAA",0],"expected":4},{"name":"single char","args":["A",0],"expected":1},{"name":"k larger than string","args":["ABCDE",10],"expected":5},{"name":"k zero distinct chars","args":["ABCDE",0],"expected":1}],
    draft: "class Solution:\n    def characterReplacement(self, s, k):\n        # TODO: implement\n        pass\n",
    solutionCode: "class Solution:\n    def characterReplacement(self, s, k):\n        count = {}\n        left = 0\n        max_freq = 0\n        best = 0\n        for right in range(len(s)):\n            count[s[right]] = count.get(s[right], 0) + 1\n            max_freq = max(max_freq, count[s[right]])\n            while (right - left + 1) - max_freq > k:\n                count[s[left]] -= 1\n                left += 1\n            best = max(best, right - left + 1)\n        return best\n",
    languageSolutions: { python: "class Solution:\n    def characterReplacement(self, s, k):\n        count = {}\n        left = 0\n        max_freq = 0\n        best = 0\n        for right in range(len(s)):\n            count[s[right]] = count.get(s[right], 0) + 1\n            max_freq = max(max_freq, count[s[right]])\n            while (right - left + 1) - max_freq > k:\n                count[s[left]] -= 1\n                left += 1\n            best = max(best, right - left + 1)\n        return best\n", java: "import java.util.HashMap;\nimport java.util.Map;\n\nclass Solution {\n    public int characterReplacement(String s, int k) {\n        Map<Character, Integer> count = new HashMap<>();\n        int left = 0;\n        int maxFreq = 0;\n        int best = 0;\n        for (int right = 0; right < s.length(); right++) {\n            char c = s.charAt(right);\n            count.put(c, count.getOrDefault(c, 0) + 1);\n            maxFreq = Math.max(maxFreq, count.get(c));\n            while ((right - left + 1) - maxFreq > k) {\n                char lc = s.charAt(left);\n                count.put(lc, count.get(lc) - 1);\n                left++;\n            }\n            best = Math.max(best, right - left + 1);\n        }\n        return best;\n    }\n}\n" },
  },
  {
    id: "lc-min-stack",
    title: "Min Stack",
    slug: "min-stack",
    url: "https://leetcode.com/problems/min-stack/",
    difficulty: "Medium",
    tags: ["Stack","Design"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "",
    description: "### Description\n\nDesign a stack that supports push, pop, top, and retrieving the minimum element in **constant time**.\n\nImplement the `MinStack` class:\n\n- `MinStack()` initializes the stack object.\n- `push(val)` pushes the integer `val` onto the stack. Returns nothing.\n- `pop()` removes the element on the top of the stack. Returns nothing.\n- `top()` returns the element on the top of the stack.\n- `getMin()` returns the minimum element currently in the stack.\n\nYou must implement each of `push`, `pop`, `top`, and `getMin` to run in O(1) time.\n\n### Example 1\n```\nInput:\n  [\"MinStack\",\"push\",\"push\",\"push\",\"getMin\",\"pop\",\"top\",\"getMin\"]\n  [[],[-2],[0],[-3],[],[],[],[]]\nOutput:\n  [null,null,null,null,-3,null,0,-2]\n\nExplanation:\n  MinStack stack = new MinStack();\n  stack.push(-2);\n  stack.push(0);\n  stack.push(-3);\n  stack.getMin(); // returns -3\n  stack.pop();\n  stack.top();    // returns 0\n  stack.getMin(); // returns -2\n```\n\n### Example 2\n```\nInput:\n  [\"MinStack\",\"push\",\"push\",\"getMin\",\"pop\",\"getMin\"]\n  [[],[2],[2],[],[],[]]\nOutput:\n  [null,null,null,2,null,2]\n\nExplanation:\n  Pushing 2 twice and popping once still leaves a 2 in the stack, so\n  the minimum after the pop is still 2.\n```\n\n### Constraints\n- `-2^31 <= val <= 2^31 - 1`\n- Methods `pop`, `top`, and `getMin` are only called on **non-empty** stacks.\n- At most `3 * 10^4` calls are made in total to `push`, `pop`, `top`, and `getMin`.\n- `pop` and `push` return nothing (`None`).",
    customTests: [{"name":"tracks min through push and pop","className":"MinStack","operations":["MinStack","push","push","push","getMin","pop","top","getMin"],"operationArgs":[[],[-2],[0],[-3],[],[],[],[]],"expected":[null,null,null,null,-3,null,0,-2]},{"name":"single element min equals top","className":"MinStack","operations":["MinStack","push","top","getMin"],"operationArgs":[[],[5],[],[]],"expected":[null,null,5,5]},{"name":"duplicate minimums survive a pop","className":"MinStack","operations":["MinStack","push","push","getMin","pop","getMin"],"operationArgs":[[],[2],[2],[],[],[]],"expected":[null,null,null,2,null,2]},{"name":"min restored after popping a smaller value","className":"MinStack","operations":["MinStack","push","push","getMin","pop","getMin","top"],"operationArgs":[[],[1],[-1],[],[],[],[]],"expected":[null,null,null,-1,null,1,1]},{"name":"increasing then decreasing sequence","className":"MinStack","operations":["MinStack","push","push","push","pop","pop","getMin","push","getMin"],"operationArgs":[[],[3],[4],[5],[],[],[],[0],[]],"expected":[null,null,null,null,null,null,3,null,0]}],
    draft: "class MinStack:\n    def __init__(self):\n        # TODO: initialize your data structures\n        pass\n\n    def push(self, val):\n        # TODO: push val; return None\n        pass\n\n    def pop(self):\n        # TODO: remove the top element; return None\n        pass\n\n    def top(self):\n        # TODO: return the top element\n        pass\n\n    def getMin(self):\n        # TODO: return the current minimum element\n        pass\n",
    solutionCode: "class MinStack:\n    def __init__(self):\n        self.stack = []\n        self.mins = []\n\n    def push(self, val):\n        self.stack.append(val)\n        if not self.mins or val <= self.mins[-1]:\n            self.mins.append(val)\n        else:\n            self.mins.append(self.mins[-1])\n\n    def pop(self):\n        self.mins.pop()\n        self.stack.pop()\n\n    def top(self):\n        return self.stack[-1]\n\n    def getMin(self):\n        return self.mins[-1]\n",
    languageSolutions: { python: "class MinStack:\n    def __init__(self):\n        self.stack = []\n        self.mins = []\n\n    def push(self, val):\n        self.stack.append(val)\n        if not self.mins or val <= self.mins[-1]:\n            self.mins.append(val)\n        else:\n            self.mins.append(self.mins[-1])\n\n    def pop(self):\n        self.mins.pop()\n        self.stack.pop()\n\n    def top(self):\n        return self.stack[-1]\n\n    def getMin(self):\n        return self.mins[-1]\n", java: "import java.util.*;\n\nclass MinStack {\n    private final Deque<Integer> stack = new ArrayDeque<>();\n    private final Deque<Integer> mins = new ArrayDeque<>();\n\n    public MinStack() {\n    }\n\n    public void push(int val) {\n        stack.push(val);\n        if (mins.isEmpty() || val <= mins.peek()) {\n            mins.push(val);\n        } else {\n            mins.push(mins.peek());\n        }\n    }\n\n    public void pop() {\n        mins.pop();\n        stack.pop();\n    }\n\n    public int top() {\n        return stack.peek();\n    }\n\n    public int getMin() {\n        return mins.peek();\n    }\n}\n" },
  },
  {
    id: "lc-evaluate-reverse-polish-notation",
    title: "Evaluate Reverse Polish Notation",
    slug: "evaluate-reverse-polish-notation",
    url: "https://leetcode.com/problems/evaluate-reverse-polish-notation/",
    difficulty: "Medium",
    tags: ["Array","Math","Stack"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "evalRPN",
    description: "You are given an array of strings `tokens` that represents an arithmetic expression in a [Reverse Polish Notation](https://en.wikipedia.org/wiki/Reverse_Polish_notation).\n\nEvaluate the expression and return *an integer that represents the value of the expression*.\n\n**Note** that:\n- The valid operators are `'+'`, `'-'`, `'*'`, and `'/'`.\n- Each operand may be an integer or another expression.\n- The division between two integers always **truncates toward zero**.\n- There will not be any division by zero.\n- The input represents a valid arithmetic expression in reverse polish notation.\n- The answer and all the intermediate calculations can be represented in a **32-bit** integer.\n\n### Example 1:\n```\nInput: tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]\nOutput: 9\nExplanation: ((2 + 1) * 3) = 9\n```\n\n### Example 2:\n```\nInput: tokens = [\"4\",\"13\",\"5\",\"/\",\"+\"]\nOutput: 6\nExplanation: (4 + (13 / 5)) = 6\n```\n\n### Example 3:\n```\nInput: tokens = [\"10\",\"6\",\"9\",\"3\",\"+\",\"-11\",\"*\",\"/\",\"*\",\"17\",\"+\",\"5\",\"+\"]\nOutput: 22\nExplanation: ((10 * (6 / ((9 + 3) * -11))) + 17) + 5\n= ((10 * (6 / (12 * -11))) + 17) + 5\n= ((10 * (6 / -132)) + 17) + 5\n= ((10 * 0) + 17) + 5\n= (0 + 17) + 5\n= 17 + 5\n= 22\n```\n\n### Constraints:\n- `1 <= tokens.length <= 10^4`\n- `tokens[i]` is either an operator: `\"+\"`, `\"-\"`, `\"*\"`, or `\"/\"`, or an integer in the range `[-200, 200]`.",
    customTests: [{"name":"basic add then multiply","args":[["2","1","+","3","*"]],"expected":9},{"name":"division and subtraction","args":[["4","13","5","/","+"]],"expected":6},{"name":"nested expression","args":[["10","6","9","3","+","-11","*","/","*","17","+","5","+"]],"expected":22},{"name":"single number","args":[["42"]],"expected":42},{"name":"negative truncation toward zero","args":[["7","-3","/"]],"expected":-2},{"name":"negative result subtraction","args":[["3","11","-"]],"expected":-8}],
    draft: "class Solution:\n    def evalRPN(self, tokens):\n        # TODO: evaluate the RPN expression and return the integer result.\n        # Division should truncate toward zero.\n        pass\n",
    solutionCode: "class Solution:\n    def evalRPN(self, tokens):\n        stack = []\n        ops = {\"+\", \"-\", \"*\", \"/\"}\n        for token in tokens:\n            if token in ops:\n                b = stack.pop()\n                a = stack.pop()\n                if token == \"+\":\n                    stack.append(a + b)\n                elif token == \"-\":\n                    stack.append(a - b)\n                elif token == \"*\":\n                    stack.append(a * b)\n                else:\n                    stack.append(int(a / b))  # truncate toward zero\n            else:\n                stack.append(int(token))\n        return stack[0]\n",
    languageSolutions: { python: "class Solution:\n    def evalRPN(self, tokens):\n        stack = []\n        ops = {\"+\", \"-\", \"*\", \"/\"}\n        for token in tokens:\n            if token in ops:\n                b = stack.pop()\n                a = stack.pop()\n                if token == \"+\":\n                    stack.append(a + b)\n                elif token == \"-\":\n                    stack.append(a - b)\n                elif token == \"*\":\n                    stack.append(a * b)\n                else:\n                    stack.append(int(a / b))  # truncate toward zero\n            else:\n                stack.append(int(token))\n        return stack[0]\n", java: "import java.util.*;\n\nclass Solution {\n    public int evalRPN(List<String> tokens) {\n        Deque<Integer> stack = new ArrayDeque<>();\n        for (String token : tokens) {\n            switch (token) {\n                case \"+\": { int b = stack.pop(), a = stack.pop(); stack.push(a + b); break; }\n                case \"-\": { int b = stack.pop(), a = stack.pop(); stack.push(a - b); break; }\n                case \"*\": { int b = stack.pop(), a = stack.pop(); stack.push(a * b); break; }\n                case \"/\": { int b = stack.pop(), a = stack.pop(); stack.push(a / b); break; }\n                default: stack.push(Integer.parseInt(token));\n            }\n        }\n        return stack.pop();\n    }\n}\n" },
  },
  {
    id: "lc-daily-temperatures",
    title: "Daily Temperatures",
    slug: "daily-temperatures",
    url: "https://leetcode.com/problems/daily-temperatures/",
    difficulty: "Medium",
    tags: ["Array","Stack","Monotonic Stack"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "dailyTemperatures",
    description: "Given an array of integers `temperatures` representing the daily temperatures, return *an array* `answer` *such that* `answer[i]` *is the number of days you have to wait after the* `i`-*th day to get a warmer temperature*. If there is no future day for which this is possible, keep `answer[i] == 0` instead.\n\n### Example 1:\n```\nInput: temperatures = [73,74,75,71,69,72,76,73]\nOutput: [1,1,4,2,1,1,0,0]\n```\n\n### Example 2:\n```\nInput: temperatures = [30,40,50,60]\nOutput: [1,1,1,0]\nExplanation: Each day is warmer than the previous, so you only wait one day, except the last.\n```\n\n### Example 3:\n```\nInput: temperatures = [30,60,90]\nOutput: [1,1,0]\n```\n\n### Constraints:\n- `1 <= temperatures.length <= 10^5`\n- `30 <= temperatures[i] <= 100`\n- A strictly **warmer** day must have a *higher* temperature; equal temperatures do not count.",
    customTests: [{"name":"classic example","args":[[73,74,75,71,69,72,76,73]],"expected":[1,1,4,2,1,1,0,0]},{"name":"strictly increasing","args":[[30,40,50,60]],"expected":[1,1,1,0]},{"name":"strictly decreasing","args":[[90,80,70,60]],"expected":[0,0,0,0]},{"name":"single day","args":[[55]],"expected":[0]},{"name":"duplicates need strictly warmer","args":[[70,70,70,71]],"expected":[3,2,1,0]},{"name":"warmer at the very end","args":[[89,62,70,58,47,47,46,76,100,70]],"expected":[8,1,5,4,3,2,1,1,0,0]}],
    draft: "class Solution:\n    def dailyTemperatures(self, temperatures):\n        # TODO: return a list where each element is the number of days\n        # until a strictly warmer temperature, or 0 if none exists.\n        pass\n",
    solutionCode: "class Solution:\n    def dailyTemperatures(self, temperatures):\n        n = len(temperatures)\n        answer = [0] * n\n        stack = []  # indices of days with a strictly decreasing temperature\n        for i, temp in enumerate(temperatures):\n            while stack and temperatures[stack[-1]] < temp:\n                prev = stack.pop()\n                answer[prev] = i - prev\n            stack.append(i)\n        return answer\n",
    languageSolutions: { python: "class Solution:\n    def dailyTemperatures(self, temperatures):\n        n = len(temperatures)\n        answer = [0] * n\n        stack = []  # indices of days with a strictly decreasing temperature\n        for i, temp in enumerate(temperatures):\n            while stack and temperatures[stack[-1]] < temp:\n                prev = stack.pop()\n                answer[prev] = i - prev\n            stack.append(i)\n        return answer\n", java: "import java.util.*;\n\nclass Solution {\n    public int[] dailyTemperatures(int[] temperatures) {\n        int n = temperatures.length;\n        int[] answer = new int[n];\n        Deque<Integer> stack = new ArrayDeque<>(); // indices, strictly decreasing temps\n        for (int i = 0; i < n; i++) {\n            while (!stack.isEmpty() && temperatures[stack.peek()] < temperatures[i]) {\n                int prev = stack.pop();\n                answer[prev] = i - prev;\n            }\n            stack.push(i);\n        }\n        return answer;\n    }\n}\n" },
  },
  {
    id: "lc-reverse-words-in-a-string",
    title: "Reverse Words in a String",
    slug: "reverse-words-in-a-string",
    url: "https://leetcode.com/problems/reverse-words-in-a-string/",
    difficulty: "Medium",
    tags: ["Two Pointers","String"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "reverseWords",
    description: "Given an input string `s`, reverse the order of the **words**.\n\nA **word** is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space.\n\nReturn *a string of the words in reverse order concatenated by a single space*.\n\n**Note** that `s` may contain leading or trailing spaces or multiple spaces between two words. The returned string should only have a single space separating the words. Do not include any extra spaces.\n\n### Example 1:\n```\nInput: s = \"the sky is blue\"\nOutput: \"blue is sky the\"\n```\n\n### Example 2:\n```\nInput: s = \"  hello world  \"\nOutput: \"world hello\"\nExplanation: Your reversed string should not contain leading or trailing spaces.\n```\n\n### Example 3:\n```\nInput: s = \"a good   example\"\nOutput: \"example good a\"\nExplanation: You need to reduce multiple spaces between two words to a single space in the reversed string.\n```\n\n### Constraints:\n- `1 <= s.length <= 10^4`\n- `s` contains English letters (upper-case and lower-case), digits, and spaces `' '`.\n- There is **at least one** word in `s`.",
    customTests: [{"name":"basic two words","args":["the sky is blue"],"expected":"blue is sky the"},{"name":"leading and trailing spaces","args":["  hello world  "],"expected":"world hello"},{"name":"multiple spaces between words collapse","args":["a good   example"],"expected":"example good a"},{"name":"single word","args":["word"],"expected":"word"},{"name":"numeric tokens","args":["10 9 8 7"],"expected":"7 8 9 10"}],
    draft: "class Solution:\n    def reverseWords(self, s):\n        # TODO: split on whitespace, collapse extra spaces, reverse word order\n        pass\n",
    solutionCode: "class Solution:\n    def reverseWords(self, s):\n        return \" \".join(reversed(s.split()))\n",
    languageSolutions: { python: "class Solution:\n    def reverseWords(self, s):\n        return \" \".join(reversed(s.split()))\n", java: "class Solution {\n    public String reverseWords(String s) {\n        String[] words = s.trim().split(\"\\\\s+\");\n        StringBuilder sb = new StringBuilder();\n        for (int i = words.length - 1; i >= 0; i--) {\n            if (words[i].isEmpty()) continue;\n            if (sb.length() > 0) sb.append(' ');\n            sb.append(words[i]);\n        }\n        return sb.toString();\n    }\n}\n" },
  },
  {
    id: "lc-reverse-string",
    title: "Reverse String",
    slug: "reverse-string",
    url: "https://leetcode.com/problems/reverse-string/",
    difficulty: "Easy",
    tags: ["Two Pointers","String"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "reverseString",
    description: "Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with `O(1)` extra memory.\n\nFor this trainer the method should also **return** the reversed array so the result can be checked.\n\n### Example 1:\n```\nInput: s = [\"h\",\"e\",\"l\",\"l\",\"o\"]\nOutput: [\"o\",\"l\",\"l\",\"e\",\"h\"]\n```\n\n### Example 2:\n```\nInput: s = [\"H\",\"a\",\"n\",\"n\",\"a\",\"h\"]\nOutput: [\"h\",\"a\",\"n\",\"n\",\"a\",\"H\"]\n```\n\n### Example 3:\n```\nInput: s = [\"z\"]\nOutput: [\"z\"]\nExplanation: A single-character array is its own reverse.\n```\n\n### Constraints:\n- `1 <= s.length <= 10^5`\n- `s[i]` is a printable ascii character (each element is a single-character string).",
    customTests: [{"name":"even length lowercase","args":[["h","e","l","l","o"]],"expected":["o","l","l","e","h"]},{"name":"palindrome-ish mixed case","args":[["H","a","n","n","a","h"]],"expected":["h","a","n","n","a","H"]},{"name":"single character","args":[["z"]],"expected":["z"]},{"name":"two characters","args":[["a","b"]],"expected":["b","a"]},{"name":"digits and symbols","args":[["1","2","!","A","_"]],"expected":["_","A","!","2","1"]}],
    draft: "class Solution:\n    def reverseString(self, s):\n        # TODO: reverse the list of single-character strings in place\n        # and return it.\n        pass",
    solutionCode: "class Solution:\n    def reverseString(self, s):\n        left, right = 0, len(s) - 1\n        while left < right:\n            s[left], s[right] = s[right], s[left]\n            left += 1\n            right -= 1\n        return s",
    languageSolutions: { python: "class Solution:\n    def reverseString(self, s):\n        left, right = 0, len(s) - 1\n        while left < right:\n            s[left], s[right] = s[right], s[left]\n            left += 1\n            right -= 1\n        return s", java: "import java.util.*;\n\nclass Solution {\n    public List<String> reverseString(List<String> s) {\n        int left = 0, right = s.size() - 1;\n        while (left < right) {\n            String tmp = s.get(left);\n            s.set(left, s.get(right));\n            s.set(right, tmp);\n            left++;\n            right--;\n        }\n        return s;\n    }\n}" },
  },
  {
    id: "lc-reverse-words-keep-punctuation",
    title: "Reverse Letters Keeping Punctuation in Place",
    slug: "reverse-words-keep-punctuation",
    url: "https://leetcode.com/problems/reverse-only-letters/",
    difficulty: "Easy",
    tags: ["Two Pointers","String"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "reverseOnlyLetters",
    description: "Given a string `s`, reverse the string according to the following rules:\n\n- All the characters that are **not** English letters remain in the same position.\n- All the English letters (lowercase or uppercase) should be reversed.\n\nReturn `s` after reversing it.\n\nIn other words, treat every non-letter character — punctuation, spaces, and digits — as a fixed obstacle that never moves. Only the letters swap, keeping their relative order reversed while flowing around the obstacles.\n\n### Example 1:\n```\nInput: s = \"a,b$c\"\nOutput: \"c,b$a\"\nExplanation: The letters a, b, c become c, b, a. The comma at index 1 and the '$' at index 3 stay in place.\n```\n\n### Example 2:\n```\nInput: s = \"ab-cd\"\nOutput: \"dc-ba\"\nExplanation: The '-' at index 2 stays put; the letters a,b,c,d reverse to d,c,b,a around it.\n```\n\n### Example 3:\n```\nInput: s = \"Test1ng-Leet=code-Q!\"\nOutput: \"Qedo1ct-eeLg=ntse-T!\"\nExplanation: Only the letters are reversed. The digit '1', the dashes, '=', and '!' all keep their original indices.\n```\n\n### Constraints:\n- `1 <= s.length <= 100`\n- `s` consists of characters with ASCII values in the range `[33, 122]`.\n- `s` does not contain `'\\\"'` or `'\\\\'`.",
    customTests: [{"name":"letters and punctuation","args":["a,b$c"],"expected":"c,b$a"},{"name":"ant-man example","args":["ab-cd"],"expected":"dc-ba"},{"name":"letters digits and symbols","args":["Test1ng-Leet=code-Q!"],"expected":"Qedo1ct-eeLg=ntse-T!"},{"name":"no letters at all","args":["12-34!@"],"expected":"12-34!@"},{"name":"all letters","args":["abcd"],"expected":"dcba"},{"name":"single character","args":["a"],"expected":"a"}],
    draft: "class Solution:\n    def reverseOnlyLetters(self, s):\n        # TODO: reverse only the English letters; leave every\n        # non-letter (punctuation/space/digit) at its original index.\n        pass\n",
    solutionCode: "class Solution:\n    def reverseOnlyLetters(self, s):\n        chars = list(s)\n        left, right = 0, len(chars) - 1\n        while left < right:\n            if not chars[left].isalpha():\n                left += 1\n            elif not chars[right].isalpha():\n                right -= 1\n            else:\n                chars[left], chars[right] = chars[right], chars[left]\n                left += 1\n                right -= 1\n        return \"\".join(chars)\n",
    languageSolutions: { python: "class Solution:\n    def reverseOnlyLetters(self, s):\n        chars = list(s)\n        left, right = 0, len(chars) - 1\n        while left < right:\n            if not chars[left].isalpha():\n                left += 1\n            elif not chars[right].isalpha():\n                right -= 1\n            else:\n                chars[left], chars[right] = chars[right], chars[left]\n                left += 1\n                right -= 1\n        return \"\".join(chars)\n", java: "class Solution {\n    public String reverseOnlyLetters(String s) {\n        char[] chars = s.toCharArray();\n        int left = 0, right = chars.length - 1;\n        while (left < right) {\n            if (!Character.isLetter(chars[left])) {\n                left++;\n            } else if (!Character.isLetter(chars[right])) {\n                right--;\n            } else {\n                char tmp = chars[left];\n                chars[left] = chars[right];\n                chars[right] = tmp;\n                left++;\n                right--;\n            }\n        }\n        return new String(chars);\n    }\n}\n" },
  },
  {
    id: "lc-maximum-depth-of-binary-tree",
    title: "Maximum Depth of Binary Tree",
    slug: "maximum-depth-of-binary-tree",
    url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/",
    difficulty: "Easy",
    tags: ["Tree","Depth-First Search","Breadth-First Search","Binary Tree"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "maxDepth",
    description: "Given the `root` of a binary tree, return *its maximum depth*.\n\nA binary tree's **maximum depth** is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\n### Example 1:\n```\nInput: root = [3,9,20,null,null,15,7]\nOutput: 3\nExplanation: The longest root-to-leaf path is 3 -> 20 -> 15 (or 3 -> 20 -> 7), which visits 3 nodes.\n```\n\n### Example 2:\n```\nInput: root = [1,null,2]\nOutput: 2\nExplanation: The tree has a single right child, so the longest path 1 -> 2 visits 2 nodes.\n```\n\n### Example 3:\n```\nInput: root = []\nOutput: 0\nExplanation: An empty tree has depth 0.\n```\n\n### Constraints:\n- The number of nodes in the tree is in the range `[0, 10^4]`.\n- `-100 <= Node.val <= 100`",
    customTests: [{"name":"balanced tree of depth 3","args":[[3,9,20,null,null,15,7]],"argTypes":["tree"],"expected":3},{"name":"right-skewed tree","args":[[1,null,2]],"argTypes":["tree"],"expected":2},{"name":"empty tree","args":[[]],"argTypes":["tree"],"expected":0},{"name":"single node","args":[[0]],"argTypes":["tree"],"expected":1},{"name":"left-skewed chain","args":[[1,2,null,3,null,4]],"argTypes":["tree"],"expected":4}],
    draft: "class Solution:\n    def maxDepth(self, root):\n        # TODO: return the maximum depth (number of nodes on the longest\n        # root-to-leaf path). An empty tree has depth 0.\n        pass\n",
    solutionCode: "class Solution:\n    def maxDepth(self, root):\n        if not root:\n            return 0\n        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))\n",
    languageSolutions: { python: "class Solution:\n    def maxDepth(self, root):\n        if not root:\n            return 0\n        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))\n", java: "class Solution {\n    public int maxDepth(TreeNode root) {\n        if (root == null) return 0;\n        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n    }\n}\n" },
  },
  {
    id: "lc-lowest-common-ancestor-of-a-bst",
    title: "Lowest Common Ancestor of a Binary Search Tree",
    slug: "lowest-common-ancestor-of-a-binary-search-tree",
    url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/",
    difficulty: "Medium",
    tags: ["Tree","Depth-First Search","Binary Search Tree","Binary Tree"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "lowestCommonAncestor",
    description: "Given a binary search tree (BST), find the lowest common ancestor (LCA) of two given node values `p` and `q` in the tree.\n\nThe lowest common ancestor is defined between two nodes `p` and `q` as the lowest node in the tree that has both `p` and `q` as descendants (where **a node is allowed to be a descendant of itself**).\n\nYou are given the BST as a level-order array (use `null` for missing children) plus two integer values `p` and `q` that are guaranteed to exist in the tree. **Return the integer value of the LCA node** (that is, `node.val`).\n\n### Example 1:\n```\nInput: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8\nOutput: 6\nExplanation: The LCA of nodes 2 and 8 is 6, since 2 lies in the left subtree\nand 8 lies in the right subtree of 6.\n```\n\n### Example 2:\n```\nInput: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4\nOutput: 2\nExplanation: The LCA of nodes 2 and 4 is 2, since a node can be a descendant\nof itself according to the LCA definition.\n```\n\n### Example 3:\n```\nInput: root = [2,1], p = 2, q = 1\nOutput: 2\n```\n\n### Constraints:\n- The number of nodes in the tree is in the range `[2, 10^5]`.\n- `-10^9 <= Node.val <= 10^9`\n- All `Node.val` are **unique**.\n- `p != q`\n- Both `p` and `q` exist in the BST.",
    customTests: [{"name":"split point (LCA between the two)","args":[[6,2,8,0,4,7,9,null,null,3,5],2,8],"argTypes":["tree","",""],"expected":6},{"name":"one node is ancestor of the other","args":[[6,2,8,0,4,7,9,null,null,3,5],2,4],"argTypes":["tree","",""],"expected":2},{"name":"deep nodes share an inner ancestor","args":[[6,2,8,0,4,7,9,null,null,3,5],3,5],"argTypes":["tree","",""],"expected":4},{"name":"node is its own ancestor at root","args":[[2,1],2,1],"argTypes":["tree","",""],"expected":2},{"name":"two descendants split at root","args":[[5,3,8,1,4,7,9],1,9],"argTypes":["tree","",""],"expected":5},{"name":"both in right subtree","args":[[5,3,8,1,4,7,9],7,9],"argTypes":["tree","",""],"expected":8}],
    draft: "class Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        # root is a TreeNode (TreeNode is predefined); p and q are integer values.\n        # Return the integer value of the lowest common ancestor node (node.val).\n        pass\n",
    solutionCode: "class Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        node = root\n        while node:\n            if p < node.val and q < node.val:\n                node = node.left\n            elif p > node.val and q > node.val:\n                node = node.right\n            else:\n                return node.val\n        return None\n",
    languageSolutions: { python: "class Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        node = root\n        while node:\n            if p < node.val and q < node.val:\n                node = node.left\n            elif p > node.val and q > node.val:\n                node = node.right\n            else:\n                return node.val\n        return None\n", java: "class Solution {\n    public int lowestCommonAncestor(TreeNode root, int p, int q) {\n        TreeNode node = root;\n        while (node != null) {\n            if (p < node.val && q < node.val) {\n                node = node.left;\n            } else if (p > node.val && q > node.val) {\n                node = node.right;\n            } else {\n                return node.val;\n            }\n        }\n        return -1;\n    }\n}\n" },
  },
  {
    id: "lc-diameter-of-binary-tree",
    title: "Diameter of Binary Tree",
    slug: "diameter-of-binary-tree",
    url: "https://leetcode.com/problems/diameter-of-binary-tree/",
    difficulty: "Easy",
    tags: ["Tree","Depth-First Search","Binary Tree"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "diameterOfBinaryTree",
    description: "Given the `root` of a binary tree, return *the length of the **diameter** of the tree*.\n\nThe **diameter** of a binary tree is the **length of the longest path** between any two nodes in the tree. This path may or may not pass through the `root`.\n\nThe **length** of a path between two nodes is represented by the **number of edges** between them.\n\n### Example 1:\n```\nInput: root = [1,2,3,4,5]\nOutput: 3\nExplanation: The longest path is [4,2,1,3] or [5,2,1,3], which has 3 edges.\n```\n\n### Example 2:\n```\nInput: root = [1,2]\nOutput: 1\nExplanation: The longest path is [2,1], which has 1 edge.\n```\n\n### Example 3:\n```\nInput: root = []\nOutput: 0\nExplanation: An empty tree has no edges, so the diameter is 0.\n```\n\n### Constraints:\n- The number of nodes in the tree is in the range `[0, 10^4]`.\n- `-100 <= Node.val <= 100`\n- The diameter is measured in **edges**, not nodes.\n- The longest path **need not** pass through the root.",
    customTests: [{"name":"balanced through root","args":[[1,2,3,4,5]],"argTypes":["tree"],"expected":3},{"name":"path not through root","args":[[1,2,3,4,5,null,null,6,7,8,9]],"argTypes":["tree"],"expected":4},{"name":"single node","args":[[1]],"argTypes":["tree"],"expected":0},{"name":"empty tree","args":[[]],"argTypes":["tree"],"expected":0},{"name":"two nodes one edge","args":[[1,2]],"argTypes":["tree"],"expected":1},{"name":"diameter through deeper node","args":[[1,2,3,4,5,null,null,6,null,7]],"argTypes":["tree"],"expected":4}],
    draft: "class Solution:\n    def diameterOfBinaryTree(self, root):\n        # TODO: return the length (in edges) of the longest path between any two nodes\n        pass\n",
    solutionCode: "class Solution:\n    def diameterOfBinaryTree(self, root):\n        best = 0\n\n        def depth(node):\n            nonlocal best\n            if not node:\n                return 0\n            left = depth(node.left)\n            right = depth(node.right)\n            best = max(best, left + right)\n            return 1 + max(left, right)\n\n        depth(root)\n        return best\n",
    languageSolutions: { python: "class Solution:\n    def diameterOfBinaryTree(self, root):\n        best = 0\n\n        def depth(node):\n            nonlocal best\n            if not node:\n                return 0\n            left = depth(node.left)\n            right = depth(node.right)\n            best = max(best, left + right)\n            return 1 + max(left, right)\n\n        depth(root)\n        return best\n", java: "class Solution {\n    private int best = 0;\n\n    public int diameterOfBinaryTree(TreeNode root) {\n        best = 0;\n        depth(root);\n        return best;\n    }\n\n    private int depth(TreeNode node) {\n        if (node == null) {\n            return 0;\n        }\n        int left = depth(node.left);\n        int right = depth(node.right);\n        best = Math.max(best, left + right);\n        return 1 + Math.max(left, right);\n    }\n}" },
  },
  {
    id: "lc-search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    slug: "search-in-rotated-sorted-array",
    url: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
    difficulty: "Medium",
    tags: ["Array","Binary Search"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "search",
    description: "There is an integer array `nums` sorted in ascending order (with **distinct** values).\n\nPrior to being passed to your function, `nums` is **possibly rotated** at an unknown pivot index `k` (`0 <= k < nums.length`) such that the resulting array is `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]` (**0-indexed**). For example, `[0,1,2,4,5,6,7]` might be rotated at pivot index `3` and become `[4,5,6,7,0,1,2]`.\n\nGiven the array `nums` **after** the possible rotation and an integer `target`, return *the index of `target` if it is in `nums`, or `-1` if it is not in `nums`*.\n\nYou must write an algorithm with `O(log n)` runtime complexity.\n\n### Example 1:\n```\nInput: nums = [4,5,6,7,0,1,2], target = 0\nOutput: 4\n```\n\n### Example 2:\n```\nInput: nums = [4,5,6,7,0,1,2], target = 3\nOutput: -1\n```\n\n### Example 3:\n```\nInput: nums = [1], target = 0\nOutput: -1\n```\n\n### Constraints:\n- `1 <= nums.length <= 5000`\n- `-10^4 <= nums[i] <= 10^4`\n- All values of `nums` are **unique**.\n- `nums` is an ascending array that is possibly rotated.\n- `-10^4 <= target <= 10^4`",
    customTests: [{"name":"found in rotated right half","args":[[4,5,6,7,0,1,2],0],"expected":4},{"name":"target absent from rotated array","args":[[4,5,6,7,0,1,2],3],"expected":-1},{"name":"single element miss","args":[[1],0],"expected":-1},{"name":"single element hit","args":[[1],1],"expected":0},{"name":"not rotated, target at end","args":[[1,2,3,4,5],5],"expected":4},{"name":"pivot element at index 0","args":[[5,1,3],5],"expected":0}],
    draft: "class Solution:\n    def search(self, nums, target):\n        # TODO: implement O(log n) search in a rotated sorted array\n        pass\n",
    solutionCode: "class Solution:\n    def search(self, nums, target):\n        lo, hi = 0, len(nums) - 1\n        while lo <= hi:\n            mid = (lo + hi) // 2\n            if nums[mid] == target:\n                return mid\n            if nums[lo] <= nums[mid]:\n                if nums[lo] <= target < nums[mid]:\n                    hi = mid - 1\n                else:\n                    lo = mid + 1\n            else:\n                if nums[mid] < target <= nums[hi]:\n                    lo = mid + 1\n                else:\n                    hi = mid - 1\n        return -1\n",
    languageSolutions: { python: "class Solution:\n    def search(self, nums, target):\n        lo, hi = 0, len(nums) - 1\n        while lo <= hi:\n            mid = (lo + hi) // 2\n            if nums[mid] == target:\n                return mid\n            if nums[lo] <= nums[mid]:\n                if nums[lo] <= target < nums[mid]:\n                    hi = mid - 1\n                else:\n                    lo = mid + 1\n            else:\n                if nums[mid] < target <= nums[hi]:\n                    lo = mid + 1\n                else:\n                    hi = mid - 1\n        return -1\n", java: "class Solution {\n    public int search(int[] nums, int target) {\n        int lo = 0, hi = nums.length - 1;\n        while (lo <= hi) {\n            int mid = (lo + hi) >>> 1;\n            if (nums[mid] == target) {\n                return mid;\n            }\n            if (nums[lo] <= nums[mid]) {\n                if (nums[lo] <= target && target < nums[mid]) {\n                    hi = mid - 1;\n                } else {\n                    lo = mid + 1;\n                }\n            } else {\n                if (nums[mid] < target && target <= nums[hi]) {\n                    lo = mid + 1;\n                } else {\n                    hi = mid - 1;\n                }\n            }\n        }\n        return -1;\n    }\n}\n" },
  },
  {
    id: "lc-kth-largest-element-in-a-stream",
    title: "Kth Largest Element in a Stream",
    slug: "kth-largest-element-in-a-stream",
    url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/",
    difficulty: "Easy",
    tags: ["Tree","Design","Binary Search Tree","Heap","Priority Queue"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "",
    description: "Design a class to find the **k-th largest** element in a stream. Note that it is the k-th largest element in the sorted order, not the k-th distinct element.\n\nImplement the `KthLargest` class:\n\n- `KthLargest(int k, int[] nums)` initializes the object with the integer `k` and the stream of integers `nums`.\n- `int add(int val)` appends the integer `val` to the stream and returns *the element representing the k-th largest element in the stream*.\n\nIt is guaranteed that there will be at least `k` elements in the stream when you search for the k-th largest element (i.e. every call to `add` is made when the stream already contains at least `k` elements after the insertion).\n\n### Example 1:\n```\nInput:\n[\"KthLargest\", \"add\", \"add\", \"add\", \"add\", \"add\"]\n[[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]\nOutput:\n[null, 4, 5, 5, 8, 8]\n\nExplanation:\nKthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);\nkthLargest.add(3);   // return 4  (stream: [2,3,4,5,8], 3rd largest is 4)\nkthLargest.add(5);   // return 5  (stream: [2,3,4,5,5,8], 3rd largest is 5)\nkthLargest.add(10);  // return 5  (stream: [2,3,4,5,5,8,10], 3rd largest is 5)\nkthLargest.add(9);   // return 8  (stream: [2,3,4,5,5,8,9,10], 3rd largest is 8)\nkthLargest.add(4);   // return 8  (stream: [2,3,4,4,5,5,8,9,10], 3rd largest is 8)\n```\n\n### Example 2:\n```\nInput:\n[\"KthLargest\", \"add\", \"add\", \"add\", \"add\"]\n[[1, []], [-5], [-2], [-10], [3]]\nOutput:\n[null, -5, -2, -2, 3]\n\nExplanation: With k = 1, every add returns the current maximum of the stream.\n```\n\n### Constraints:\n- `1 <= k <= 10^4`\n- `0 <= nums.length <= 10^4`\n- `-10^4 <= nums[i] <= 10^4`\n- `-10^4 <= val <= 10^4`\n- At most `10^4` calls will be made to `add`.\n- It is guaranteed that there will be at least `k` elements in the array when you search for the k-th element.",
    customTests: [{"name":"leetcode example k=3","className":"KthLargest","operations":["KthLargest","add","add","add","add","add"],"operationArgs":[[3,[4,5,8,2]],[3],[5],[10],[9],[4]],"expected":[null,4,5,5,8,8]},{"name":"k=1 tracks running max","className":"KthLargest","operations":["KthLargest","add","add","add"],"operationArgs":[[1,[-5]],[-2],[-10],[3]],"expected":[null,-2,-2,3]},{"name":"k equals initial length","className":"KthLargest","operations":["KthLargest","add","add"],"operationArgs":[[2,[0,0]],[-1],[1]],"expected":[null,0,0]},{"name":"duplicates and negatives","className":"KthLargest","operations":["KthLargest","add","add","add"],"operationArgs":[[2,[7,7,7,7]],[7],[8],[9]],"expected":[null,7,7,8]},{"name":"small init below k grows","className":"KthLargest","operations":["KthLargest","add","add","add"],"operationArgs":[[3,[5]],[1],[3],[8]],"expected":[null,1,1,3]}],
    draft: "import heapq\n\nclass KthLargest:\n    def __init__(self, k, nums):\n        # TODO: initialize your data structure\n        pass\n\n    def add(self, val):\n        # TODO: add val to the stream and return the kth largest element\n        pass\n",
    solutionCode: "import heapq\n\nclass KthLargest:\n    def __init__(self, k, nums):\n        self.k = k\n        self.heap = list(nums)\n        heapq.heapify(self.heap)\n        while len(self.heap) > k:\n            heapq.heappop(self.heap)\n\n    def add(self, val):\n        heapq.heappush(self.heap, val)\n        if len(self.heap) > self.k:\n            heapq.heappop(self.heap)\n        return self.heap[0]\n",
    languageSolutions: { python: "import heapq\n\nclass KthLargest:\n    def __init__(self, k, nums):\n        self.k = k\n        self.heap = list(nums)\n        heapq.heapify(self.heap)\n        while len(self.heap) > k:\n            heapq.heappop(self.heap)\n\n    def add(self, val):\n        heapq.heappush(self.heap, val)\n        if len(self.heap) > self.k:\n            heapq.heappop(self.heap)\n        return self.heap[0]\n", java: "import java.util.*;\n\nclass KthLargest {\n    private final int k;\n    private final PriorityQueue<Integer> heap;\n\n    public KthLargest(int k, int[] nums) {\n        this.k = k;\n        this.heap = new PriorityQueue<>();\n        for (int num : nums) {\n            add(num);\n        }\n    }\n\n    public int add(int val) {\n        heap.offer(val);\n        while (heap.size() > k) {\n            heap.poll();\n        }\n        return heap.peek();\n    }\n}\n" },
  },
  {
    id: "lc-last-stone-weight",
    title: "Last Stone Weight",
    slug: "last-stone-weight",
    url: "https://leetcode.com/problems/last-stone-weight/",
    difficulty: "Easy",
    tags: ["Array","Heap","Priority Queue"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "lastStoneWeight",
    description: "You are given an array of integers `stones` where `stones[i]` is the weight of the `i`-th stone.\n\nWe are playing a game with the stones. On each turn, we choose the **two heaviest** stones and smash them together. Suppose the two heaviest stones have weights `x` and `y` with `x <= y`. The result of this smash is:\n\n- If `x == y`, both stones are destroyed, and\n- If `x != y`, the stone of weight `x` is destroyed, and the stone of weight `y` has new weight `y - x`.\n\nAt the end of the game, there is **at most one** stone left.\n\nReturn *the weight of the last remaining stone*. If there are no stones left, return `0`.\n\n### Example 1:\n```\nInput: stones = [2,7,4,1,8,1]\nOutput: 1\nExplanation:\nWe combine 7 and 8 to get 1, so the array converts to [2,4,1,1,1].\nWe combine 2 and 4 to get 2, so the array converts to [2,1,1,1].\nWe combine 2 and 1 to get 1, so the array converts to [1,1,1].\nWe combine 1 and 1 to get 0, so the array converts to [1].\nThe last stone has weight 1, so we return 1.\n```\n\n### Example 2:\n```\nInput: stones = [1]\nOutput: 1\nExplanation: Only one stone is present, so it is the last stone.\n```\n\n### Example 3:\n```\nInput: stones = [3,3]\nOutput: 0\nExplanation: The two equal stones are smashed together and both are destroyed, leaving no stones.\n```\n\n### Constraints:\n- `1 <= stones.length <= 30`\n- `1 <= stones[i] <= 1000`",
    customTests: [{"name":"two heaviest cancel","args":[[2,7,4,1,8,1]],"expected":1},{"name":"single stone","args":[[1]],"expected":1},{"name":"all stones destroyed","args":[[3,3]],"expected":0},{"name":"pair fully cancels leaving none","args":[[2,2]],"expected":0},{"name":"large equal-weight set","args":[[10,4,2,10]],"expected":2},{"name":"two distinct stones","args":[[9,3]],"expected":6}],
    draft: "class Solution:\n    def lastStoneWeight(self, stones):\n        # TODO: repeatedly smash the two heaviest stones; return the last weight (or 0)\n        pass\n",
    solutionCode: "import heapq\n\nclass Solution:\n    def lastStoneWeight(self, stones):\n        heap = [-s for s in stones]\n        heapq.heapify(heap)\n        while len(heap) > 1:\n            first = -heapq.heappop(heap)\n            second = -heapq.heappop(heap)\n            if first != second:\n                heapq.heappush(heap, -(first - second))\n        return -heap[0] if heap else 0\n",
    languageSolutions: { python: "import heapq\n\nclass Solution:\n    def lastStoneWeight(self, stones):\n        heap = [-s for s in stones]\n        heapq.heapify(heap)\n        while len(heap) > 1:\n            first = -heapq.heappop(heap)\n            second = -heapq.heappop(heap)\n            if first != second:\n                heapq.heappush(heap, -(first - second))\n        return -heap[0] if heap else 0\n", java: "import java.util.PriorityQueue;\nimport java.util.Collections;\n\nclass Solution {\n    public int lastStoneWeight(int[] stones) {\n        PriorityQueue<Integer> heap = new PriorityQueue<>(Collections.reverseOrder());\n        for (int s : stones) {\n            heap.offer(s);\n        }\n        while (heap.size() > 1) {\n            int first = heap.poll();\n            int second = heap.poll();\n            if (first != second) {\n                heap.offer(first - second);\n            }\n        }\n        return heap.isEmpty() ? 0 : heap.peek();\n    }\n}\n" },
  },
  {
    id: "lc-insert-interval",
    title: "Insert Interval",
    slug: "insert-interval",
    url: "https://leetcode.com/problems/insert-interval/",
    difficulty: "Medium",
    tags: ["Array","Intervals"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "insert",
    description: "You are given an array of non-overlapping intervals `intervals` where `intervals[i] = [start_i, end_i]` represent the start and the end of the `i`-th interval and `intervals` is sorted in ascending order by `start_i`. You are also given an interval `newInterval = [start, end]` that represents the start and end of another interval.\n\nInsert `newInterval` into `intervals` such that `intervals` is still sorted in ascending order by `start_i` and `intervals` still does not have any overlapping intervals (merge overlapping intervals if necessary).\n\nReturn *`intervals` after the insertion*.\n\n**Note** that you don't need to modify `intervals` in-place. You can make a new array and return it.\n\n### Example 1:\n```\nInput: intervals = [[1,3],[6,9]], newInterval = [2,5]\nOutput: [[1,5],[6,9]]\nExplanation: The new interval [2,5] overlaps with [1,3], so they merge into [1,5].\n```\n\n### Example 2:\n```\nInput: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]\nOutput: [[1,2],[3,10],[12,16]]\nExplanation: Because the new interval [4,8] overlaps with [3,5],[6,7],[8,10], they merge into [3,10].\n```\n\n### Example 3:\n```\nInput: intervals = [], newInterval = [5,7]\nOutput: [[5,7]]\n```\n\n### Constraints:\n- `0 <= intervals.length <= 10^4`\n- `intervals[i].length == 2`\n- `0 <= start_i <= end_i <= 10^5`\n- `intervals` is sorted by `start_i` in **ascending** order.\n- `newInterval.length == 2`\n- `0 <= start <= end <= 10^5`",
    customTests: [{"name":"insert with overlap","args":[[[1,3],[6,9]],[2,5]],"expected":[[1,5],[6,9]]},{"name":"swallow multiple intervals","args":[[[1,2],[3,5],[6,7],[8,10],[12,16]],[4,8]],"expected":[[1,2],[3,10],[12,16]]},{"name":"empty list","args":[[],[5,7]],"expected":[[5,7]]},{"name":"insert before all","args":[[[3,5],[8,10]],[1,2]],"expected":[[1,2],[3,5],[8,10]]},{"name":"insert after all","args":[[[1,2],[3,5]],[6,8]],"expected":[[1,2],[3,5],[6,8]]},{"name":"touching endpoints merge","args":[[[1,5]],[5,7]],"expected":[[1,7]]}],
    draft: "class Solution:\n    def insert(self, intervals, newInterval):\n        # TODO: insert newInterval into the sorted, non-overlapping intervals,\n        # merging any overlaps, and return the resulting list.\n        pass\n",
    solutionCode: "class Solution:\n    def insert(self, intervals, newInterval):\n        result = []\n        i = 0\n        n = len(intervals)\n        # Add all intervals ending before newInterval starts.\n        while i < n and intervals[i][1] < newInterval[0]:\n            result.append(intervals[i])\n            i += 1\n        # Merge all intervals that overlap newInterval.\n        start, end = newInterval[0], newInterval[1]\n        while i < n and intervals[i][0] <= end:\n            start = min(start, intervals[i][0])\n            end = max(end, intervals[i][1])\n            i += 1\n        result.append([start, end])\n        # Add the remaining intervals.\n        while i < n:\n            result.append(intervals[i])\n            i += 1\n        return result\n",
    languageSolutions: { python: "class Solution:\n    def insert(self, intervals, newInterval):\n        result = []\n        i = 0\n        n = len(intervals)\n        # Add all intervals ending before newInterval starts.\n        while i < n and intervals[i][1] < newInterval[0]:\n            result.append(intervals[i])\n            i += 1\n        # Merge all intervals that overlap newInterval.\n        start, end = newInterval[0], newInterval[1]\n        while i < n and intervals[i][0] <= end:\n            start = min(start, intervals[i][0])\n            end = max(end, intervals[i][1])\n            i += 1\n        result.append([start, end])\n        # Add the remaining intervals.\n        while i < n:\n            result.append(intervals[i])\n            i += 1\n        return result\n", java: "import java.util.*;\n\nclass Solution {\n    public int[][] insert(int[][] intervals, int[] newInterval) {\n        List<int[]> result = new ArrayList<>();\n        int i = 0, n = intervals.length;\n        // Add all intervals ending before newInterval starts.\n        while (i < n && intervals[i][1] < newInterval[0]) {\n            result.add(intervals[i]);\n            i++;\n        }\n        // Merge all intervals that overlap newInterval.\n        int start = newInterval[0], end = newInterval[1];\n        while (i < n && intervals[i][0] <= end) {\n            start = Math.min(start, intervals[i][0]);\n            end = Math.max(end, intervals[i][1]);\n            i++;\n        }\n        result.add(new int[]{start, end});\n        // Add the remaining intervals.\n        while (i < n) {\n            result.add(intervals[i]);\n            i++;\n        }\n        return result.toArray(new int[result.size()][]);\n    }\n}\n" },
  },
  {
    id: "lc-meeting-rooms",
    title: "Meeting Rooms",
    slug: "meeting-rooms",
    url: "https://leetcode.com/problems/meeting-rooms/",
    difficulty: "Easy",
    tags: ["Array","Sorting","Intervals"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "canAttendMeetings",
    description: "Given an array of meeting time `intervals` where `intervals[i] = [start_i, end_i]`, determine if a person could attend **all** meetings.\n\nA person can attend every meeting only if no two meetings overlap. Two meetings overlap when one starts strictly before another ends. Meetings that merely touch at an endpoint (one ends exactly when the next begins, e.g. `[1, 5]` and `[5, 10]`) do **not** overlap.\n\nReturn `true` if all meetings can be attended, and `false` otherwise.\n\n### Example 1:\n```\nInput: intervals = [[0,30],[5,10],[15,20]]\nOutput: false\nExplanation: [0,30] overlaps with both [5,10] and [15,20], so they cannot all be attended.\n```\n\n### Example 2:\n```\nInput: intervals = [[7,10],[2,4]]\nOutput: true\nExplanation: [2,4] and [7,10] do not overlap.\n```\n\n### Example 3:\n```\nInput: intervals = [[1,5],[5,10],[10,15]]\nOutput: true\nExplanation: Each meeting ends exactly when the next one starts, so there is no overlap.\n```\n\n### Constraints:\n- `0 <= intervals.length <= 10^4`\n- `intervals[i].length == 2`\n- `0 <= start_i <= end_i <= 10^6`",
    customTests: [{"name":"overlap exists","args":[[[0,30],[5,10],[15,20]]],"expected":false},{"name":"no overlap","args":[[[7,10],[2,4]]],"expected":true},{"name":"empty schedule","args":[[]],"expected":true},{"name":"single meeting","args":[[[5,8]]],"expected":true},{"name":"touching endpoints ok","args":[[[1,5],[5,10],[10,15]]],"expected":true},{"name":"identical times overlap","args":[[[2,7],[2,7]]],"expected":false}],
    draft: "class Solution:\n    def canAttendMeetings(self, intervals):\n        # TODO: return True if a person can attend all meetings (no overlaps)\n        pass\n",
    solutionCode: "class Solution:\n    def canAttendMeetings(self, intervals):\n        intervals.sort(key=lambda item: item[0])\n        for i in range(1, len(intervals)):\n            if intervals[i][0] < intervals[i - 1][1]:\n                return False\n        return True\n",
    languageSolutions: { python: "class Solution:\n    def canAttendMeetings(self, intervals):\n        intervals.sort(key=lambda item: item[0])\n        for i in range(1, len(intervals)):\n            if intervals[i][0] < intervals[i - 1][1]:\n                return False\n        return True\n", java: "import java.util.Arrays;\n\nclass Solution {\n    public boolean canAttendMeetings(int[][] intervals) {\n        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));\n        for (int i = 1; i < intervals.length; i++) {\n            if (intervals[i][0] < intervals[i - 1][1]) {\n                return false;\n            }\n        }\n        return true;\n    }\n}\n" },
  },
  {
    id: "lc-reverse-linked-list",
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    url: "https://leetcode.com/problems/reverse-linked-list/",
    difficulty: "Easy",
    tags: ["Linked List","Recursion"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "reverseList",
    description: "Given the `head` of a singly linked list, reverse the list, and return *the head of the reversed list*.\n\nA singly linked list is encoded here as a plain array of its node values in order. The empty list is the empty array `[]`. Your function receives the actual linked-list head node (with `.val` and `.next`) and must return the new head after reversal.\n\n### Example 1:\n```\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n```\n\n### Example 2:\n```\nInput: head = [1,2]\nOutput: [2,1]\n```\n\n### Example 3:\n```\nInput: head = []\nOutput: []\n```\n\n### Constraints:\n- The number of nodes in the list is in the range `[0, 5000]`.\n- `-5000 <= Node.val <= 5000`\n\n**Follow up:** A linked list can be reversed either iteratively or recursively. Could you implement both?",
    customTests: [{"name":"five nodes","args":[[1,2,3,4,5]],"argTypes":["listnode"],"expected":[5,4,3,2,1],"expectedType":"listnode"},{"name":"two nodes","args":[[1,2]],"argTypes":["listnode"],"expected":[2,1],"expectedType":"listnode"},{"name":"single node","args":[[7]],"argTypes":["listnode"],"expected":[7],"expectedType":"listnode"},{"name":"empty list","args":[[]],"argTypes":["listnode"],"expected":[],"expectedType":"listnode"},{"name":"duplicates and negatives","args":[[-3,-3,0,5,5]],"argTypes":["listnode"],"expected":[5,5,0,-3,-3],"expectedType":"listnode"}],
    draft: "class Solution:\n    def reverseList(self, head):\n        # TODO: reverse the singly linked list and return the new head\n        pass\n",
    solutionCode: "class Solution:\n    def reverseList(self, head):\n        prev = None\n        current = head\n        while current:\n            nxt = current.next\n            current.next = prev\n            prev = current\n            current = nxt\n        return prev\n",
    languageSolutions: { python: "class Solution:\n    def reverseList(self, head):\n        prev = None\n        current = head\n        while current:\n            nxt = current.next\n            current.next = prev\n            prev = current\n            current = nxt\n        return prev\n", java: "class Solution {\n    public ListNode reverseList(ListNode head) {\n        ListNode prev = null;\n        ListNode current = head;\n        while (current != null) {\n            ListNode next = current.next;\n            current.next = prev;\n            prev = current;\n            current = next;\n        }\n        return prev;\n    }\n}\n" },
  },
  {
    id: "lc-merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    slug: "merge-two-sorted-lists",
    url: "https://leetcode.com/problems/merge-two-sorted-lists/",
    difficulty: "Easy",
    tags: ["Linked List","Recursion"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "mergeTwoLists",
    description: "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one **sorted** linked list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn *the head of the merged linked list*.\n\n### Example 1:\n```\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n```\n\n### Example 2:\n```\nInput: list1 = [], list2 = []\nOutput: []\n```\n\n### Example 3:\n```\nInput: list1 = [], list2 = [0]\nOutput: [0]\n```\n\n### Constraints:\n- The number of nodes in both lists is in the range `[0, 50]`.\n- `-100 <= Node.val <= 100`\n- Both `list1` and `list2` are sorted in **non-decreasing** order.",
    customTests: [{"name":"interleaved lists","args":[[1,2,4],[1,3,4]],"argTypes":["listnode","listnode"],"expected":[1,1,2,3,4,4],"expectedType":"listnode"},{"name":"both empty","args":[[],[]],"argTypes":["listnode","listnode"],"expected":[],"expectedType":"listnode"},{"name":"one empty","args":[[],[0]],"argTypes":["listnode","listnode"],"expected":[0],"expectedType":"listnode"},{"name":"first exhausted early","args":[[5],[1,2,4]],"argTypes":["listnode","listnode"],"expected":[1,2,4,5],"expectedType":"listnode"},{"name":"duplicates across lists","args":[[2,2,3],[2,4]],"argTypes":["listnode","listnode"],"expected":[2,2,2,3,4],"expectedType":"listnode"},{"name":"negatives","args":[[-9,-3,0],[-7,1]],"argTypes":["listnode","listnode"],"expected":[-9,-7,-3,0,1],"expectedType":"listnode"}],
    draft: "class Solution:\n    def mergeTwoLists(self, list1, list2):\n        # TODO: merge the two sorted linked lists and return the new head\n        pass\n",
    solutionCode: "class Solution:\n    def mergeTwoLists(self, list1, list2):\n        dummy = ListNode(0)\n        tail = dummy\n        while list1 and list2:\n            if list1.val <= list2.val:\n                tail.next = list1\n                list1 = list1.next\n            else:\n                tail.next = list2\n                list2 = list2.next\n            tail = tail.next\n        tail.next = list1 if list1 else list2\n        return dummy.next\n",
    languageSolutions: { python: "class Solution:\n    def mergeTwoLists(self, list1, list2):\n        dummy = ListNode(0)\n        tail = dummy\n        while list1 and list2:\n            if list1.val <= list2.val:\n                tail.next = list1\n                list1 = list1.next\n            else:\n                tail.next = list2\n                list2 = list2.next\n            tail = tail.next\n        tail.next = list1 if list1 else list2\n        return dummy.next\n", java: "class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        ListNode dummy = new ListNode(0);\n        ListNode tail = dummy;\n        while (list1 != null && list2 != null) {\n            if (list1.val <= list2.val) {\n                tail.next = list1;\n                list1 = list1.next;\n            } else {\n                tail.next = list2;\n                list2 = list2.next;\n            }\n            tail = tail.next;\n        }\n        tail.next = (list1 != null) ? list1 : list2;\n        return dummy.next;\n    }\n}\n" },
  },
  {
    id: "lc-subsets",
    title: "Subsets",
    slug: "subsets",
    url: "https://leetcode.com/problems/subsets/",
    difficulty: "Medium",
    tags: ["Array","Backtracking","Bit Manipulation"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "subsets",
    description: "Given an integer array `nums` of **unique** elements, return *all possible subsets (the power set)*.\n\nThe solution set **must not** contain duplicate subsets. Return the solution in **any order**.\n\n### Example 1:\n```\nInput: nums = [1,2,3]\nOutput: [[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]]\n```\n\n### Example 2:\n```\nInput: nums = [0]\nOutput: [[],[0]]\n```\n\n### Example 3:\n```\nInput: nums = [-1,0]\nOutput: [[],[-1],[0],[-1,0]]\n```\n\n### Constraints:\n- `1 <= nums.length <= 10`\n- `-10 <= nums[i] <= 10`\n- All the numbers of `nums` are **unique**.\n\n> Note: subsets may be returned in any order, and the elements within each subset may be in any order — your output is compared as an unordered collection of unordered subsets.",
    customTests: [{"name":"three distinct","args":[[1,2,3]],"expected":[[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]],"validator":"unorderedDeepNestedList"},{"name":"single element","args":[[0]],"expected":[[],[0]],"validator":"unorderedDeepNestedList"},{"name":"two negatives and zero","args":[[-1,0]],"expected":[[],[-1],[0],[-1,0]],"validator":"unorderedDeepNestedList"},{"name":"four elements count","args":[[5,6,7,8]],"expected":[[],[5],[6],[7],[8],[5,6],[5,7],[5,8],[6,7],[6,8],[7,8],[5,6,7],[5,6,8],[5,7,8],[6,7,8],[5,6,7,8]],"validator":"unorderedDeepNestedList"},{"name":"non-sequential values","args":[[10,1,-3]],"expected":[[],[10],[1],[-3],[1,10],[-3,10],[-3,1],[-3,1,10]],"validator":"unorderedDeepNestedList"}],
    draft: "class Solution:\n    def subsets(self, nums):\n        # TODO: return all possible subsets (the power set) of nums\n        pass\n",
    solutionCode: "class Solution:\n    def subsets(self, nums):\n        result = []\n\n        def backtrack(start, current):\n            result.append(current[:])\n            for i in range(start, len(nums)):\n                current.append(nums[i])\n                backtrack(i + 1, current)\n                current.pop()\n\n        backtrack(0, [])\n        return result\n",
    languageSolutions: { python: "class Solution:\n    def subsets(self, nums):\n        result = []\n\n        def backtrack(start, current):\n            result.append(current[:])\n            for i in range(start, len(nums)):\n                current.append(nums[i])\n                backtrack(i + 1, current)\n                current.pop()\n\n        backtrack(0, [])\n        return result\n", java: "import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> subsets(int[] nums) {\n        List<List<Integer>> result = new ArrayList<>();\n        backtrack(nums, 0, new ArrayList<>(), result);\n        return result;\n    }\n\n    private void backtrack(int[] nums, int start, List<Integer> current, List<List<Integer>> result) {\n        result.add(new ArrayList<>(current));\n        for (int i = start; i < nums.length; i++) {\n            current.add(nums[i]);\n            backtrack(nums, i + 1, current, result);\n            current.remove(current.size() - 1);\n        }\n    }\n}\n" },
  },
  {
    id: "lc-permutations",
    title: "Permutations",
    slug: "permutations",
    url: "https://leetcode.com/problems/permutations/",
    difficulty: "Medium",
    tags: ["Array","Backtracking"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "permute",
    description: "Given an array `nums` of **distinct** integers, return *all the possible permutations*. You can return the answer in **any order**.\n\n### Example 1:\n```\nInput: nums = [1,2,3]\nOutput: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]\n```\n\n### Example 2:\n```\nInput: nums = [0,1]\nOutput: [[0,1],[1,0]]\n```\n\n### Example 3:\n```\nInput: nums = [1]\nOutput: [[1]]\n```\n\n### Constraints:\n- `1 <= nums.length <= 6`\n- `-10 <= nums[i] <= 10`\n- All the integers of `nums` are **unique**.",
    customTests: [{"name":"three distinct","args":[[1,2,3]],"expected":[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]],"validator":"unorderedNestedList"},{"name":"two elements","args":[[0,1]],"expected":[[0,1],[1,0]],"validator":"unorderedNestedList"},{"name":"single element","args":[[1]],"expected":[[1]],"validator":"unorderedNestedList"},{"name":"negatives included","args":[[-1,0,1]],"expected":[[-1,0,1],[-1,1,0],[0,-1,1],[0,1,-1],[1,-1,0],[1,0,-1]],"validator":"unorderedNestedList"}],
    draft: "class Solution:\n    def permute(self, nums):\n        # TODO: return all permutations of nums\n        pass\n",
    solutionCode: "class Solution:\n    def permute(self, nums):\n        result = []\n        used = [False] * len(nums)\n        current = []\n\n        def backtrack():\n            if len(current) == len(nums):\n                result.append(current[:])\n                return\n            for i in range(len(nums)):\n                if used[i]:\n                    continue\n                used[i] = True\n                current.append(nums[i])\n                backtrack()\n                current.pop()\n                used[i] = False\n\n        backtrack()\n        return result\n",
    languageSolutions: { python: "class Solution:\n    def permute(self, nums):\n        result = []\n        used = [False] * len(nums)\n        current = []\n\n        def backtrack():\n            if len(current) == len(nums):\n                result.append(current[:])\n                return\n            for i in range(len(nums)):\n                if used[i]:\n                    continue\n                used[i] = True\n                current.append(nums[i])\n                backtrack()\n                current.pop()\n                used[i] = False\n\n        backtrack()\n        return result\n", java: "import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> permute(int[] nums) {\n        List<List<Integer>> result = new ArrayList<>();\n        boolean[] used = new boolean[nums.length];\n        List<Integer> current = new ArrayList<>();\n        backtrack(nums, used, current, result);\n        return result;\n    }\n\n    private void backtrack(int[] nums, boolean[] used, List<Integer> current, List<List<Integer>> result) {\n        if (current.size() == nums.length) {\n            result.add(new ArrayList<>(current));\n            return;\n        }\n        for (int i = 0; i < nums.length; i++) {\n            if (used[i]) continue;\n            used[i] = true;\n            current.add(nums[i]);\n            backtrack(nums, used, current, result);\n            current.remove(current.size() - 1);\n            used[i] = false;\n        }\n    }\n}" },
  },
  {
    id: "lc-combination-sum",
    title: "Combination Sum",
    slug: "combination-sum",
    url: "https://leetcode.com/problems/combination-sum/",
    difficulty: "Medium",
    tags: ["Array","Backtracking"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "combinationSum",
    description: "Given an array of **distinct** integers `candidates` and a target integer `target`, return *a list of all **unique combinations** of `candidates` where the chosen numbers sum to `target`*. You may return the combinations in **any order**.\n\nThe **same** number may be chosen from `candidates` an **unlimited number of times**. Two combinations are unique if the frequency of at least one of the chosen numbers is different.\n\nThe test cases are generated such that the number of unique combinations that sum up to `target` is less than `150` combinations for the given input.\n\n### Example 1:\n```\nInput: candidates = [2,3,6,7], target = 7\nOutput: [[2,2,3],[7]]\nExplanation:\n2 and 3 are candidates, and 2 + 2 + 3 = 7. Note that 2 can be used multiple times.\n7 is a candidate, and 7 = 7.\nThese are the only two combinations.\n```\n\n### Example 2:\n```\nInput: candidates = [2,3,5], target = 8\nOutput: [[2,2,2,2],[2,3,3],[3,5]]\n```\n\n### Example 3:\n```\nInput: candidates = [2], target = 1\nOutput: []\n```\n\n### Constraints:\n- `1 <= candidates.length <= 30`\n- `2 <= candidates[i] <= 40`\n- All elements of `candidates` are **distinct**.\n- `1 <= target <= 40`\n\n> Note: the grader compares combinations order-independently, but emit each combination sorted ascending.",
    customTests: [{"name":"classic candidates","args":[[2,3,6,7],7],"validator":"unorderedDeepNestedList","expected":[[2,2,3],[7]]},{"name":"multiple combos","args":[[2,3,5],8],"validator":"unorderedDeepNestedList","expected":[[2,2,2,2],[2,3,3],[3,5]]},{"name":"no solution","args":[[2],1],"validator":"unorderedDeepNestedList","expected":[]},{"name":"single candidate exact multiple","args":[[3],9],"validator":"unorderedDeepNestedList","expected":[[3,3,3]]},{"name":"two candidates many combos","args":[[2,5],10],"validator":"unorderedDeepNestedList","expected":[[2,2,2,2,2],[5,5]]},{"name":"target smaller than all","args":[[5,6,7],3],"validator":"unorderedDeepNestedList","expected":[]}],
    draft: "class Solution:\n    def combinationSum(self, candidates, target):\n        # TODO: return all unique combinations summing to target.\n        # Each candidate may be reused unlimited times; emit each combo sorted.\n        pass\n",
    solutionCode: "class Solution:\n    def combinationSum(self, candidates, target):\n        candidates.sort()\n        results = []\n\n        def backtrack(start, remaining, combo):\n            if remaining == 0:\n                results.append(combo[:])\n                return\n            for i in range(start, len(candidates)):\n                value = candidates[i]\n                if value > remaining:\n                    break\n                combo.append(value)\n                backtrack(i, remaining - value, combo)\n                combo.pop()\n\n        backtrack(0, target, [])\n        return results\n",
    languageSolutions: { python: "class Solution:\n    def combinationSum(self, candidates, target):\n        candidates.sort()\n        results = []\n\n        def backtrack(start, remaining, combo):\n            if remaining == 0:\n                results.append(combo[:])\n                return\n            for i in range(start, len(candidates)):\n                value = candidates[i]\n                if value > remaining:\n                    break\n                combo.append(value)\n                backtrack(i, remaining - value, combo)\n                combo.pop()\n\n        backtrack(0, target, [])\n        return results\n", java: "import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> combinationSum(int[] candidates, int target) {\n        Arrays.sort(candidates);\n        List<List<Integer>> results = new ArrayList<>();\n        backtrack(candidates, 0, target, new ArrayList<>(), results);\n        return results;\n    }\n\n    private void backtrack(int[] candidates, int start, int remaining,\n                           List<Integer> combo, List<List<Integer>> results) {\n        if (remaining == 0) {\n            results.add(new ArrayList<>(combo));\n            return;\n        }\n        for (int i = start; i < candidates.length; i++) {\n            if (candidates[i] > remaining) {\n                break;\n            }\n            combo.add(candidates[i]);\n            backtrack(candidates, i, remaining - candidates[i], combo, results);\n            combo.remove(combo.size() - 1);\n        }\n    }\n}\n" },
  },
  {
    id: "lc-climbing-stairs",
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    url: "https://leetcode.com/problems/climbing-stairs/",
    difficulty: "Easy",
    tags: ["Math","Dynamic Programming","Memoization"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "climbStairs",
    description: "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many **distinct ways** can you climb to the top?\n\n### Example 1:\n```\nInput: n = 2\nOutput: 2\nExplanation: There are two ways to climb to the top.\n1. 1 step + 1 step\n2. 2 steps\n```\n\n### Example 2:\n```\nInput: n = 3\nOutput: 3\nExplanation: There are three ways to climb to the top.\n1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step\n```\n\n### Example 3:\n```\nInput: n = 5\nOutput: 8\n```\n\n### Constraints:\n- `1 <= n <= 45`",
    customTests: [{"name":"two steps","args":[2],"expected":2},{"name":"three steps","args":[3],"expected":3},{"name":"single step base case","args":[1],"expected":1},{"name":"five steps","args":[5],"expected":8},{"name":"larger input","args":[10],"expected":89},{"name":"max constraint n=45","args":[45],"expected":1836311903}],
    draft: "class Solution:\n    def climbStairs(self, n):\n        # TODO: return the number of distinct ways to climb n steps\n        pass\n",
    solutionCode: "class Solution:\n    def climbStairs(self, n):\n        prev, curr = 1, 1\n        for _ in range(n - 1):\n            prev, curr = curr, prev + curr\n        return curr\n",
    languageSolutions: { python: "class Solution:\n    def climbStairs(self, n):\n        prev, curr = 1, 1\n        for _ in range(n - 1):\n            prev, curr = curr, prev + curr\n        return curr\n", java: "class Solution {\n    public int climbStairs(int n) {\n        int prev = 1, curr = 1;\n        for (int i = 0; i < n - 1; i++) {\n            int next = prev + curr;\n            prev = curr;\n            curr = next;\n        }\n        return curr;\n    }\n}\n" },
  },
  {
    id: "lc-house-robber",
    title: "House Robber",
    slug: "house-robber",
    url: "https://leetcode.com/problems/house-robber/",
    difficulty: "Medium",
    tags: ["Array","Dynamic Programming"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "rob",
    description: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, represented by the integer array `nums`. The only constraint stopping you from robbing each of them is that **adjacent houses have security systems connected**, and it will automatically contact the police if two adjacent houses were broken into on the same night.\n\nGiven an integer array `nums` representing the amount of money of each house, return *the maximum amount of money you can rob tonight **without alerting the police***.\n\n### Example 1:\n```\nInput: nums = [1,2,3,1]\nOutput: 4\nExplanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).\nTotal amount you can rob = 1 + 3 = 4.\n```\n\n### Example 2:\n```\nInput: nums = [2,7,9,3,1]\nOutput: 12\nExplanation: Rob house 1 (money = 2), rob house 3 (money = 9) and rob house 5 (money = 1).\nTotal amount you can rob = 2 + 9 + 1 = 12.\n```\n\n### Example 3:\n```\nInput: nums = [5]\nOutput: 5\nExplanation: Only one house — rob it.\n```\n\n### Constraints:\n- `1 <= nums.length <= 100`\n- `0 <= nums[i] <= 400`",
    customTests: [{"name":"alternating houses","args":[[1,2,3,1]],"expected":4},{"name":"skip to bigger","args":[[2,7,9,3,1]],"expected":12},{"name":"single house","args":[[5]],"expected":5},{"name":"two houses pick max","args":[[2,1]],"expected":2},{"name":"all equal even count","args":[[4,4,4,4]],"expected":8},{"name":"large middle dominates","args":[[2,1,1,100,1,1,2]],"expected":104}],
    draft: "class Solution:\n    def rob(self, nums):\n        # TODO: return the maximum money robbable without taking adjacent houses\n        pass\n",
    solutionCode: "class Solution:\n    def rob(self, nums):\n        prev, curr = 0, 0\n        for value in nums:\n            prev, curr = curr, max(curr, prev + value)\n        return curr\n",
    languageSolutions: { python: "class Solution:\n    def rob(self, nums):\n        prev, curr = 0, 0\n        for value in nums:\n            prev, curr = curr, max(curr, prev + value)\n        return curr\n", java: "class Solution {\n    public int rob(int[] nums) {\n        int prev = 0, curr = 0;\n        for (int value : nums) {\n            int next = Math.max(curr, prev + value);\n            prev = curr;\n            curr = next;\n        }\n        return curr;\n    }\n}\n" },
  },
  {
    id: "lc-longest-common-subsequence",
    title: "Longest Common Subsequence",
    slug: "longest-common-subsequence",
    url: "https://leetcode.com/problems/longest-common-subsequence/",
    difficulty: "Medium",
    tags: ["String","Dynamic Programming"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "longestCommonSubsequence",
    description: "Given two strings `text1` and `text2`, return *the length of their longest **common subsequence***. If there is no common subsequence, return `0`.\n\nA **subsequence** of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.\n\n- For example, `\"ace\"` is a subsequence of `\"abcde\"`.\n\nA **common subsequence** of two strings is a subsequence that is common to both strings.\n\n### Example 1:\n```\nInput: text1 = \"abcde\", text2 = \"ace\"\nOutput: 3\nExplanation: The longest common subsequence is \"ace\" and its length is 3.\n```\n\n### Example 2:\n```\nInput: text1 = \"abc\", text2 = \"abc\"\nOutput: 3\nExplanation: The longest common subsequence is \"abc\" and its length is 3.\n```\n\n### Example 3:\n```\nInput: text1 = \"abc\", text2 = \"def\"\nOutput: 0\nExplanation: There is no such common subsequence, so the result is 0.\n```\n\n### Constraints:\n- `1 <= text1.length, text2.length <= 1000`\n- `text1` and `text2` consist of only lowercase English characters.",
    customTests: [{"name":"shared subsequence ace","args":["abcde","ace"],"expected":3},{"name":"identical strings","args":["abc","abc"],"expected":3},{"name":"no common characters","args":["abc","def"],"expected":0},{"name":"single character match","args":["a","a"],"expected":1},{"name":"interleaved subsequence","args":["bsbininm","jmjkbkjkv"],"expected":1},{"name":"longer overlap","args":["ezupkr","ubmrapg"],"expected":2}],
    draft: "class Solution:\n    def longestCommonSubsequence(self, text1, text2):\n        # TODO: return the length of the longest common subsequence\n        pass\n",
    solutionCode: "class Solution:\n    def longestCommonSubsequence(self, text1, text2):\n        m, n = len(text1), len(text2)\n        dp = [[0] * (n + 1) for _ in range(m + 1)]\n        for i in range(1, m + 1):\n            for j in range(1, n + 1):\n                if text1[i - 1] == text2[j - 1]:\n                    dp[i][j] = dp[i - 1][j - 1] + 1\n                else:\n                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])\n        return dp[m][n]\n",
    languageSolutions: { python: "class Solution:\n    def longestCommonSubsequence(self, text1, text2):\n        m, n = len(text1), len(text2)\n        dp = [[0] * (n + 1) for _ in range(m + 1)]\n        for i in range(1, m + 1):\n            for j in range(1, n + 1):\n                if text1[i - 1] == text2[j - 1]:\n                    dp[i][j] = dp[i - 1][j - 1] + 1\n                else:\n                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])\n        return dp[m][n]\n", java: "class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        int m = text1.length(), n = text2.length();\n        int[][] dp = new int[m + 1][n + 1];\n        for (int i = 1; i <= m; i++) {\n            for (int j = 1; j <= n; j++) {\n                if (text1.charAt(i - 1) == text2.charAt(j - 1)) {\n                    dp[i][j] = dp[i - 1][j - 1] + 1;\n                } else {\n                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);\n                }\n            }\n        }\n        return dp[m][n];\n    }\n}\n" },
  },
  {
    id: "lc-ttl-store",
    title: "In-Memory Store with TTL",
    slug: "in-memory-store-with-ttl",
    url: "",
    difficulty: "Medium",
    tags: ["Hash Table","Design"],
    paidOnly: false,
    acceptance: null,
    syncedAt: seededAt,
    methodName: "",
    description: "### Description\n\nDesign an in-memory key-value store, `TTLStore`, where every stored value carries an explicit expiry time. To keep the store fully deterministic and testable, time is **never read from a clock** — the caller passes the current time explicitly on every read.\n\nImplement the class with this exact API:\n\n- `TTLStore()` — construct an empty store.\n- `set(key, value, expireAt) -> None` — store `value` under `key`, valid until (but not including) the timestamp `expireAt`. If `key` already exists, both its value and its expiry are overwritten.\n- `get(key, now) -> value or None` — return the value stored under `key` when it is still alive, otherwise return `None`. The entry is considered **alive only while `now < expireAt`**. Return `None` when:\n  - the key was never set, or\n  - the key has expired, i.e. `now >= expireAt`.\n\nTimestamps are integers (a logical clock). `expireAt` is the first instant at which the entry is no longer readable, so a value set with `expireAt = 10` is visible for `now` in `{..., 8, 9}` and gone from `now = 10` onward. Values may be of any type (numbers, strings, etc.).\n\n### Examples\n\n**Example 1**\n```\nTTLStore()            -> None\nset(\"a\", 1, 10)       -> None      # \"a\" -> 1, alive while now < 10\nget(\"a\", 5)           -> 1         # 5 < 10, alive\nget(\"a\", 9)           -> 1         # 9 < 10, alive\nget(\"a\", 10)          -> None      # 10 >= 10, expired\n```\n\n**Example 2**\n```\nTTLStore()            -> None\nget(\"ghost\", 0)       -> None      # never set\nset(\"x\", 42, 100)     -> None\nget(\"y\", 50)          -> None      # \"y\" was never set\n```\n\n**Example 3 (overwrite replaces value and expiry)**\n```\nTTLStore()            -> None\nset(\"k\", \"old\", 5)    -> None\nget(\"k\", 3)           -> \"old\"     # 3 < 5\nset(\"k\", \"new\", 20)   -> None      # overwrites value and expiry\nget(\"k\", 7)           -> \"new\"     # old entry would have expired at 5, but it was replaced\nget(\"k\", 20)          -> None      # 20 >= 20, expired\n```\n\n### Constraints\n\n- `get` uses a strict comparison: an entry is alive iff `now < expireAt`. At exactly `now == expireAt` the entry is already expired.\n- `set` always returns `None`; the constructor returns `None`.\n- Keys are unique; setting an existing key overwrites both its value and its `expireAt`.\n- Reads do not mutate the store (no auto-eviction is required for correctness).",
    customTests: [{"name":"get before expiry returns value, after expiry returns None","className":"TTLStore","operations":["TTLStore","set","get","get","get"],"operationArgs":[[],["a",1,10],["a",5],["a",9],["a",10]],"expected":[null,null,1,1,null]},{"name":"missing key returns None","className":"TTLStore","operations":["TTLStore","get","set","get"],"operationArgs":[[],["ghost",0],["x",42,100],["y",50]],"expected":[null,null,null,null]},{"name":"overwrite updates value and expiry","className":"TTLStore","operations":["TTLStore","set","get","set","get","get"],"operationArgs":[[],["k","old",5],["k",3],["k","new",20],["k",7],["k",20]],"expected":[null,null,"old",null,"new",null]},{"name":"now exactly at expireAt is already expired","className":"TTLStore","operations":["TTLStore","set","get","get"],"operationArgs":[[],["t","v",0],["t",0],["t",-1]],"expected":[null,null,null,"v"]},{"name":"multiple independent keys","className":"TTLStore","operations":["TTLStore","set","set","get","get","get"],"operationArgs":[[],["a",1,5],["b",2,100],["a",4],["a",6],["b",6]],"expected":[null,null,null,1,null,2]}],
    draft: "class TTLStore:\n    def __init__(self):\n        # TODO: initialize your storage\n        pass\n\n    def set(self, key, value, expireAt):\n        # TODO: store value under key, valid while now < expireAt\n        pass\n\n    def get(self, key, now):\n        # TODO: return value if alive (now < expireAt), else None\n        pass\n",
    solutionCode: "class TTLStore:\n    def __init__(self):\n        self.store = {}\n\n    def set(self, key, value, expireAt):\n        self.store[key] = (value, expireAt)\n        return None\n\n    def get(self, key, now):\n        if key not in self.store:\n            return None\n        value, expireAt = self.store[key]\n        if now >= expireAt:\n            return None\n        return value\n",
    languageSolutions: { python: "class TTLStore:\n    def __init__(self):\n        self.store = {}\n\n    def set(self, key, value, expireAt):\n        self.store[key] = (value, expireAt)\n        return None\n\n    def get(self, key, now):\n        if key not in self.store:\n            return None\n        value, expireAt = self.store[key]\n        if now >= expireAt:\n            return None\n        return value\n", java: "import java.util.*;\n\nclass TTLStore {\n    private final Map<String, Object[]> store = new HashMap<>();\n\n    public void set(String key, Object value, int expireAt) {\n        store.put(key, new Object[] { value, expireAt });\n    }\n\n    public Object get(String key, int now) {\n        Object[] entry = store.get(key);\n        if (entry == null) return null;\n        int expireAt = (int) entry[1];\n        if (now >= expireAt) return null;\n        return entry[0];\n    }\n}\n" },
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
