/* AlgoForge curriculum. Pure data: add a chapter or level here and the whole site picks it up.
 *
 * Item types:  mcq | scenario | order | bug | { t:'gen', g:'<generator>' } (fresh random puzzle each play)
 * Markup in text: `code`, **bold**.  In scenario text: [[signal phrase]] and ((story noise)).
 */
(function (root) {
  'use strict';

  /* ---- helpers to keep level data compact ---- */
  const mcq = (q, o, a, why, extra) => Object.assign({ t: 'mcq', q, o, a, why }, extra);
  const sc = (text, o, a, why, trap) => ({ t: 'scenario', text, o, a, why, trap });
  const order = (title, steps) => ({ t: 'order', title, steps });
  const bug = (title, desc, code, bugLine, why) => ({ t: 'bug', title, desc, code, bug: bugLine, why });
  const gen = (g, n) => Array.from({ length: n || 1 }, () => ({ t: 'gen', g }));

  /* ---- reusable scenarios (used in levels, bosses and practice) ---- */
  const S = {
    twoSum: sc('A shopkeeper named ((Ravi)) has an [[unsorted]] list of 100,000 prices. He wants [[two prices that add up to a target]] and, for each price, needs to [[check instantly whether its partner was already seen]].',
      ['Hash map of prices seen so far', 'Two pointers from both ends', 'Binary search on the list', 'Sort, then sliding window'], 0,
      'The partner of each price is fully determined (target − price). "Have I seen it?" is exactly what a hash table answers in O(1).',
      [1, 'Two pointers needs sorted data. Sorting costs O(n log n) and destroys the original positions.']),
    wordCount: sc('Count how many times each word appears in a ((10 GB)) server log, in [[a single pass]], with [[lookup by word]].',
      ['Hash map: word → count', 'Sorted array + binary search per word', 'Stack of words', 'Queue of words'], 0,
      'You need fast "find this key and update it". A hash map gives O(1) average per word.'),
    sortedPair: sc('A [[sorted]] array of 200,000 ((company)) salaries. Find [[two values that sum to a target]]. The platform allows only [[O(1) extra memory]].',
      ['Two pointers', 'Hash set of seen values', 'Min-heap', 'Recursion with memo'], 0,
      'Sorted order tells you which pointer to move: sum too small → advance left; too big → retreat right. No extra memory.',
      [1, 'A hash set is correct but uses O(n) memory, which the problem forbids.']),
    cycle: sc('Detect whether a [[linked list]] contains a [[cycle]] while using [[O(1) extra memory]]. ((The list stores customer names.))',
      ['Fast & slow pointers', 'Hash set of visited nodes', 'Stack', 'Sort the nodes'], 0,
      'A fast runner laps a slow runner only if there is a loop, with no storage needed.',
      [1, 'A visited-set works but costs O(n) memory, exactly what is forbidden.']),
    window: sc('A chat app logs a stream of characters from a user called ((Mira)). Find the [[longest contiguous stretch]] that has [[no repeated character]].',
      ['Sliding window', 'DP over all substrings', 'Backtracking', 'Binary search on the answer'], 0,
      '"Contiguous stretch + a rule that can break" is the sliding-window signature: extend right, shrink left when the rule breaks.',
      [1, 'DP over all substrings is O(n²) work for something a moving frame does in one pass.']),
    brackets: sc('Check whether a string such as ({[]}) is valid. The [[most recently opened bracket must be closed first]]. ((The string came from a text editor.))',
      ['Stack', 'Hash map', 'Two pointers from both ends', 'Priority queue'], 0,
      '"Most recent first" is LIFO. The stack holds brackets still waiting to be closed.',
      [2, 'Two pointers from the ends fails on ()(): the partner is not at the mirrored position.']),
    printQueue: sc('A print server must handle jobs [[in exactly the order they arrive]]: [[first come, first served]]. ((Printers are noisy.))',
      ['Queue', 'Stack', 'Min-heap', 'Hash set'], 0, 'First in, first out is the definition of a queue.',
      [1, 'A stack serves the newest job first, the opposite of what is needed.']),
    firstBad: sc('There are 1,000,000,000 versions of an app. [[Every version after the first bad one is also bad]]. Each test is ((slow and expensive)), so you want [[the fewest test runs]].',
      ['Binary search', 'Linear scan', 'Greedy', 'Sliding window'], 0,
      '"good…good…BAD…bad" is a monotonic yes/no. Each test discards half the range: about 30 runs.',
      [1, 'Testing one by one needs up to a billion runs.']),
    topK: sc('From a ((live game)) stream of 10 million scores, always report the [[k largest]]. Memory fits [[about k scores]] and [[new scores keep arriving]].',
      ['Min-heap of size k', 'Re-sort everything on each arrival', 'Stack', 'Hash map of scores'], 0,
      'A size-k min-heap keeps the k largest; the smallest of them sits on top, ready to be evicted.',
      [1, 'Re-sorting needs all 10 million scores in memory and repeats work on each arrival.']),
    meetings: sc('Pick the [[maximum number of non-overlapping meetings]] for ((one conference room)). Choosing the [[meeting that frees the room earliest]] can be proven never to hurt.',
      ['Greedy: sort by end time', 'Backtrack over every subset', 'Sliding window', 'Union-Find'], 0,
      'Finishing earliest leaves the most room for the rest. An exchange argument proves it never loses.',
      [1, 'Trying every subset is exponential. A provably safe local choice makes it unnecessary.']),
    maze: sc('A robot in a ((cheerful orange)) warehouse grid must reach the exit. [[Every move costs the same]]. Find the [[fewest moves]].',
      ['BFS', 'DFS', 'Dijkstra', 'Dynamic programming'], 0,
      'BFS explores in rings of equal distance, so the first time it reaches the exit is the shortest path.',
      [1, 'DFS finds a path, not the shortest. Dijkstra also works but is overkill when all costs are equal.']),
    islands: sc('Count the [[islands]] in a grid of ((turquoise)) water and land, where [[connected land cells]] form one island.',
      ['DFS / flood fill', 'Binary search', 'Heap', 'Greedy sort'], 0,
      'Flood-fill from each unvisited land cell, marking everything reachable. Each flood is one island.'),
    route: sc('Cities are linked by roads with [[different travel times]]. Find the [[fastest route]] from city A to every other city. ((A storm is forecast.)) [[No road has negative time.]]',
      ['Dijkstra', 'BFS', 'DFS', 'Union-Find'], 0,
      'Always expanding the closest unsettled city is correct when all costs are non-negative.',
      [1, 'BFS counts hops, not time. A 2-hop 100-minute route would beat a 3-hop 10-minute one.']),
    friends: sc('Friendships are added one pair at a time. After each, answer whether two people are in the [[same friend group]]. Groups [[keep merging]] as the ((social app)) grows.',
      ['Union-Find', 'BFS per query', 'Sort the users', 'Stack'], 0,
      'Union-Find merges groups and checks membership in near-constant time.',
      [1, 'BFS re-scans the whole graph on every query: far too slow with millions of updates.']),
    courses: sc('A university has courses with [[prerequisites]]. Find an [[order to take all courses]], or report it is impossible when there is a [[circular dependency]]. ((The registrar is strict.))',
      ['Topological sort', 'Plain BFS', 'Union-Find', 'Binary search'], 0,
      'Topological sort orders nodes so every dependency comes first. If you cannot place all nodes, there is a cycle.',
      [1, 'Plain BFS ignores dependencies: it can schedule a course before its prerequisites.']),
    perms: sc('List [[every possible arrangement]] of 8 distinct letters ((for a puzzle app)). You build candidates [[one choice at a time and undo a choice]] to try the next.',
      ['Backtracking', 'Dynamic programming', 'Greedy', 'Two pointers'], 0,
      '"Enumerate everything" + "build step by step" = choose, explore, un-choose.',
      [1, 'DP needs overlapping subproblems with one optimal value. Here you must output every arrangement.']),
    coins: sc('Given coin values, find the [[fewest coins]] to make 10,000. The best answer for an amount [[builds on best answers for smaller amounts]] and the same sub-amounts [[come up again and again]]. ((The coins are old British ones.))',
      ['Dynamic programming', 'Greedy: biggest coin first', 'Binary search', 'Two pointers'], 0,
      'Overlapping subproblems + optimal substructure = DP. Solve each smaller amount once and reuse it.',
      [1, 'Greedy fails on {1,3,4} for 6: it takes 4+1+1 (3 coins) but 3+3 uses 2.']),
    lcs: sc('Find the length of the [[longest common subsequence]] of two ((DNA)) strings of 1,000 characters. [[Answers for shorter prefixes of both strings]] feed into longer ones.',
      ['2-D dynamic programming', 'Sliding window', 'Greedy', 'Stack'], 0,
      'dp[i][j] depends on dp[i−1][j−1], dp[i−1][j], dp[i][j−1]: a table over prefix pairs.'),
    autocomplete: sc('A dictionary holds 500,000 words. On every keystroke, return all words that [[start with the typed prefix]]. An exact-match lookup is ((not enough)); the app needs [[prefix queries]].',
      ['Trie', 'Hash map of whole words', 'Stack', 'Binary heap'], 0,
      'A trie shares common prefixes along a path, so a prefix leads straight to the subtree of all matches.',
      [1, 'A hash map answers "is this exact word present?", not "what starts with this?".']),
    rangeSum: sc('An array of daily sales ((for a bakery)) [[never changes]]. Answer 100,000 queries of the form [[total sales between day i and day j]].',
      ['Prefix sums', 'Sliding window', 'Heap', 'Backtracking'], 0,
      'Precompute running totals once; every range sum becomes a single subtraction.',
      [1, 'Summing the range per query is O(n) each: up to 10 billion operations in total.']),
    nextWarmer: sc('For [[each day]], find how many days until a [[warmer temperature]]. ((The data is from Lisbon.)) You want one pass over 100,000 days where unresolved days [[wait for something bigger]].',
      ['Monotonic stack', 'Sliding window', 'Prefix sums', 'Heap'], 0,
      'A stack holds days still waiting for a warmer one; a warmer day resolves everything colder on top.',
      [1, 'A fixed-size window cannot know how far ahead the next warmer day is.'])
  };

  /* ---- reusable step-ordering challenges ---- */
  const O = {
    twoSum: order('Two Sum with a hash map', ['Walk through the prices one at a time', 'Work out the partner: target minus this price', 'Look the partner up in the table of prices seen so far', 'If it is there, return the pair and stop', 'If not, store this price in the table and move on']),
    window: order('Longest stretch without repeats', ['Grow the window by taking the next character on the right', 'If that character is already in the window, shrink from the left until it is not', 'Record the window length if it is the longest so far', 'Repeat until the end of the stream']),
    brackets: order('Validate brackets', ['Scan the string left to right', 'On an opening bracket, push it onto the stack', 'On a closing bracket, pop the top and check that it matches', 'If it mismatches or the stack is empty, the string is invalid', 'At the end the stack must be empty to be valid']),
    bsearch: order('Binary search for the first bad version', ['Set the range to all versions, first to last', 'Test the middle version', 'If it is bad, the answer is at or before it: drop the right half', 'If it is good, the answer is after it: drop the left half', 'Stop when only one version remains in range']),
    sortedPair: order('Two pointers on a sorted array', ['Place one marker at the smallest value and one at the largest', 'Add the two values under the markers', 'If the sum is too small, move the left marker right', 'If the sum is too large, move the right marker left', 'If the sum equals the target, return the pair']),
    topK: order('Top-k with a min-heap', ['Keep a min-heap capped at size k', 'For each new score, push it into the heap', 'If the heap now has more than k items, pop the smallest', 'The heap now holds the k largest scores', 'The top of the heap is the k-th largest']),
    meetings: order('Pick the most meetings', ['Sort the meetings by end time', 'Take the first meeting', 'For each next meeting, check if it starts after the last chosen one ends', 'If yes, take it; if not, skip it', 'Count the meetings you took']),
    bfs: order('Shortest path in a grid (BFS)', ['Put the start cell in a queue and mark it visited', 'Take the oldest cell from the queue', 'If it is the exit, return its distance', 'Add every unvisited neighbour to the queue with distance + 1', 'Repeat until the queue is empty']),
    dijkstra: order("Dijkstra's algorithm", ["Set the start city's distance to 0 and every other city's to infinity", 'Put the start city in a min-priority queue', 'Pop the city with the smallest distance', 'For each road from it, if distance + road time improves a neighbour, update and push it', 'Repeat until the queue is empty']),
    topo: order('Topological sort (Kahn)', ['Count how many prerequisites each course has', 'Queue every course with zero prerequisites', 'Take a course from the queue and add it to the order', 'Reduce the count for courses that depend on it, queueing those that reach zero', 'If the order contains all courses it is valid; otherwise there is a cycle']),
    unionFind: order('Union-Find', ['Start with every person in their own group', "For a new friendship, find the leader of each person's group", 'If the leaders differ, link one group under the other', "To answer a query, compare the two people's leaders", "While finding a leader, point nodes straight at it to speed up later lookups"]),
    perms: order('Generate permutations', ['Pick an unused letter and append it to the current arrangement', 'Recurse to fill the next position', 'If the arrangement is full, record it', 'Remove the letter you added (undo)', 'Try the next unused letter in that position']),
    coins: order('Fewest coins (DP)', ['Define best[a] as the fewest coins for amount a, with best[0] = 0', 'Loop over every amount from 1 up to the target', 'For each amount, try every coin that fits', 'Update best[a] = min(best[a], best[a − coin] + 1)', 'The answer is best[target]']),
    grid: order('Count grid paths (DP)', ['Create a table the same size as the grid and set paths[0][0] = 1', 'Visit cells row by row, left to right', 'If a cell is blocked, set its count to 0', 'Otherwise add the count from the cell above and the cell to the left', 'The bottom-right cell holds the answer']),
    trie: order('Autocomplete with a trie', ['For each word, walk its letters, creating tree nodes as needed', 'Mark the last node of each word as a word end', 'For a typed prefix, follow its letters down from the root', 'If the path breaks, there are no matches', 'Otherwise collect every word below that node']),
    prefix: order('Range sums with prefix sums', ['Build prefix[k] as the sum of the first k days', 'For a query (i, j), take prefix[j+1]', 'Subtract prefix[i]', 'Return the difference as the range total']),
    bstInsert: order('Insert into a BST', ['Start at the root', 'If the new value is smaller than the current node, go left; otherwise go right', 'Repeat until you reach an empty child slot', 'Place the new node there']),
    merge: order('Merge sort', ['If the list has one item, it is already sorted', 'Split the list into two halves', 'Sort each half recursively', 'Merge the two sorted halves by repeatedly taking the smaller front item'])
  };

  /* ---- chapters and levels ---- */
  const CHAPTERS = [
    {
      id: 'foundations', title: 'Foundations', icon: '🧭', color: '#6ea8ff', blurb: 'Measure cost, then learn the first four tools every other chapter builds on.',
      levels: [
        {
          id: 'bigo', title: 'Big-O Basics', icon: '📈', skill: 'bigo', blurb: 'Read code and predict how it scales.',
          lesson: [
            { h: 'Why Big-O?', p: 'Big-O describes how the **work grows as the input n grows**, ignoring constants. A computer does roughly **10⁸ simple operations per second**, so with n = 100,000, O(n log n) is instant but O(n²) (10¹⁰ steps) takes minutes.' },
            { h: 'The classes, fastest to slowest', p: '`O(1)` < `O(log n)` < `O(n)` < `O(n log n)` < `O(n²)` < `O(2ⁿ)`. When n is a million: n log n ≈ 20 million (fine), n² = 10¹² (impossible).' },
            { h: 'How to read code', p: '**Sequential loops add. Nested loops multiply. Halving or doubling gives a log.** Constants and smaller terms drop: 3n + 50 is O(n).', code: 'for i in 1..n:        // n times\n  for j in 1..n:      // × n times\n    work()            // => O(n²)' }
          ],
          items: [
            mcq('n = 100,000 and you can afford about 10⁸ operations. Which complexity is **safe**?', ['O(n²)', 'O(n log n)', 'O(2ⁿ)', 'O(n³)'], 1, 'n log n ≈ 1.7 million operations. n² = 10 billion, which is far too many.'),
            mcq('Two loops run **one after the other**, each O(n). Total complexity?', ['O(n²)', 'O(n)', 'O(2ⁿ)', 'O(n log n)'], 1, 'Sequential work adds: n + n = 2n, and the constant drops.'),
            mcq('Which is the **same** complexity as O(3n + 50)?', ['O(n²)', 'O(log n)', 'O(n)', 'O(1)'], 2, 'Big-O ignores constants and lower-order terms.'),
            ...gen('bigO', 3)
          ]
        },
        {
          id: 'hashing', title: 'Arrays & Hashing', icon: '🗂️', skill: 'hash', blurb: 'Trade memory for speed with lookups.',
          lesson: [
            { h: 'Arrays vs hash maps', p: 'An array gives O(1) access **by index** but O(n) to search by value. A **hash map** finds a key in **O(1) on average**, at the cost of extra memory.' },
            { h: 'The "seen before" pattern', p: 'Whenever you think "have I met this value already?", reach for a hash set or map. It powers **Two Sum, duplicates, frequency counts, anagram groups**.' },
            { h: 'Spot it', p: 'Signals: "unsorted", "find the pair", "count occurrences", "first repeated", "in one pass".', code: 'for x in nums:\n  need = target - x\n  if need in seen: return pair\n  seen.add(x)' }
          ],
          items: [S.twoSum, S.wordCount, O.twoSum,
            bug('Spot the bug: Two Sum', 'This returns a wrong pair for nums = [3], target = 6. Which line is the problem?',
              ['function twoSum(nums, target):', '  seen = empty map', '  for i in 0..len(nums)-1:', '    seen[nums[i]] = i', '    need = target - nums[i]', '    if need in seen: return [seen[need], i]', '  return none'], 3,
              'Storing before checking lets an element pair with itself. Check for the partner first, store afterwards.'),
            ...gen('freq', 2)]
        },
        {
          id: 'twoptr', title: 'Two Pointers & Windows', icon: '🪟', skill: 'window', blurb: 'Walk an array with two cursors, in O(n).',
          lesson: [
            { h: 'Two pointers', p: 'On **sorted** data, put one pointer at each end. Too small a sum? Move the left one up. Too big? Move the right one down. Each pointer only moves one way, so the pass is **O(n)** with O(1) memory.' },
            { h: 'Sliding window', p: 'For a **contiguous stretch** with a rule, keep a window `[left, right]`. Extend `right`; when the rule breaks, advance `left`. Add the new element, subtract the one that left.' },
            { h: 'Fast & slow pointers', p: 'Two pointers moving at different speeds detect **cycles** and find **midpoints** in linked lists without extra memory.' }
          ],
          items: [S.sortedPair, S.window, S.cycle, O.window,
            bug('Spot the bug: window sum', 'This sliding window gives the wrong sum. Which line is wrong?',
              ['function maxSumK(a, k):', '  sum = a[0] + ... + a[k-1]', '  best = sum', '  for i from k to len(a)-1:', '    sum = sum + a[i] - a[i - k - 1]', '    best = max(best, sum)', '  return best'], 4,
              'The window [i−k+1 .. i] drops a[i−k], not a[i−k−1]. The off-by-one removes the wrong element.'),
            ...gen('twoptr', 1), ...gen('windowSum', 2)]
        },
        {
          id: 'stack', title: 'Stacks & Queues', icon: '📚', skill: 'stack', blurb: 'Last-in-first-out and first-in-first-out.',
          lesson: [
            { h: 'Stack = LIFO', p: 'Push and pop at the **same end**. Use it when the **most recent** thing matters first: undo history, bracket matching, DFS, expression parsing.' },
            { h: 'Queue = FIFO', p: 'Add at the back, remove from the front. Use it when **arrival order** matters: scheduling, and **BFS**.' },
            { h: 'Monotonic stack', p: 'Keep a stack in sorted order to answer "next greater element" questions in O(n): each item is pushed once and popped once.' }
          ],
          items: [S.brackets, S.printQueue, S.nextWarmer, O.brackets,
            bug('Spot the bug: brackets', 'This crashes on the input ")". Which line is the problem?',
              ['function valid(s):', '  stack = empty', '  for ch in s:', '    if ch is an opening bracket: push(ch)', '    else:', '      top = pop()', '      if not matches(top, ch): return false', '  return stack is empty'], 5,
              'Popping an empty stack crashes. Check that the stack is non-empty first; if it is empty, return false.'),
            ...gen('stackSim', 2)]
        }
      ]
    },
    {
      id: 'search-order', title: 'Search & Order', icon: '🔎', color: '#a78bfa', blurb: 'Cut the search space in half, keep things sorted, and always grab the best item.',
      levels: [
        {
          id: 'bsearch', title: 'Binary Search', icon: '✂️', skill: 'bsearch', blurb: 'Halve the problem on every step.',
          lesson: [
            { h: 'Halve it', p: 'If the data is **sorted**, or the answer flips from "no" to "yes" exactly once, test the **middle** and discard half. 1,000,000 items take only **20 probes**.' },
            { h: 'Search the answer', p: 'Binary search also works on **answers**: "smallest capacity that works", "first bad version". If feasibility is monotonic, binary-search it.', code: 'lo = 0; hi = n - 1\nwhile lo <= hi:\n  mid = (lo + hi) / 2\n  if a[mid] == target: return mid\n  if a[mid] < target: lo = mid + 1\n  else: hi = mid - 1' }
          ],
          items: [...gen('bsearch', 2), S.firstBad, O.bsearch,
            mcq('At most how many probes does binary search need for **1,000,000** sorted items?', ['10', '20', '1,000', '500,000'], 1, 'log₂(1,000,000) ≈ 19.9, so 20 probes.'),
            bug('Spot the bug: infinite loop', 'This binary search never terminates for some inputs. Which line?',
              ['lo = 0, hi = len(a) - 1', 'while lo <= hi:', '  mid = (lo + hi) / 2', '  if a[mid] == target: return mid', '  if a[mid] < target: lo = mid', '  else: hi = mid - 1', 'return -1'], 4,
              'With lo = 0, hi = 1, mid = 0: if a[0] < target then lo stays 0 forever. It must be lo = mid + 1.')]
        },
        {
          id: 'sorting', title: 'Sorting', icon: '🔀', skill: 'sort', blurb: 'Know your sorts and when each one wins.',
          lesson: [
            { h: 'The big picture', p: 'Simple sorts (bubble, insertion, selection) are **O(n²)**. Merge sort, heap sort and quicksort are **O(n log n)** (quicksort on average). Comparison sorting can never beat O(n log n).' },
            { h: 'Pick by situation', p: '**Insertion sort** is O(n) on nearly sorted data. **Merge sort** is stable and always n log n. **Counting sort** is O(n + k) when values come from a small range.' }
          ],
          items: [
            mcq('Which sort is **stable** and **guaranteed O(n log n)** in the worst case?', ['Quicksort', 'Merge sort', 'Bubble sort', 'Selection sort'], 1, 'Merge sort splits evenly every time and preserves the order of equal items. Quicksort can degrade to O(n²).'),
            mcq('A list is **almost sorted** (a few items out of place). Which simple sort is fastest in practice?', ['Selection sort', 'Insertion sort', 'Heap sort', 'Bogosort'], 1, 'Insertion sort does very little work when items are already near their place: close to O(n).'),
            mcq('Sort **10 million integers**, each between 0 and 1,000. Best approach?', ['Bubble sort', 'Counting sort', 'Merge sort of strings', 'Binary search'], 1, 'Counting sort is O(n + k) = O(n) when the value range k is small.'),
            O.merge, ...gen('sortPass', 3)]
        },
        {
          id: 'heaps', title: 'Heaps', icon: '⛰️', skill: 'heap', blurb: 'Always know the smallest or largest.',
          lesson: [
            { h: 'What is a heap?', p: 'A **min-heap** is a tree stored in an array where every parent is ≤ its children, so the **minimum is always at index 0**. Peek is O(1); insert and extract are **O(log n)**.' },
            { h: 'Parent and child maths', p: 'For index `i`: parent = `(i−1)/2`, children = `2i+1` and `2i+2`. Insert = append then **sift up**. Extract = move last to root then **sift down**.' },
            { h: 'When to use it', p: '"Top-k", "k-th largest", "merge k sorted lists", "next smallest event". Streaming data with a repeatedly-changing best item.' }
          ],
          items: [S.topK, O.topK,
            mcq('What is the cost of **peeking** at the minimum of a min-heap?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 0, 'The minimum is always at the root, index 0.'),
            mcq('What is the cost of **inserting** into a heap of n items?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 1, 'Sift-up climbs at most the height of the tree: log n.'),
            ...gen('heapOps', 3)]
        },
        {
          id: 'greedy', title: 'Greedy & Intervals', icon: '🎯', skill: 'greedy', blurb: 'Local best choices that are provably safe.',
          lesson: [
            { h: 'Greedy', p: 'Make the **best local choice** at each step and never look back. It only works when you can **prove** the local choice is safe (an exchange argument). Otherwise use DP.' },
            { h: 'Intervals', p: 'Interval problems almost always start with **sorting**: by start to merge, by end to pick the most non-overlapping. Then one sweep.' }
          ],
          items: [S.meetings, O.meetings,
            mcq('Coins {1, 3, 4}, amount 6. Greedy "biggest coin first" uses how many coins, and is that optimal?', ['3 coins, not optimal (3+3 = 2 coins)', '2 coins, optimal', '3 coins, optimal', '4 coins, optimal'], 0, 'Greedy picks 4+1+1 = 3 coins, but 3+3 uses only 2. Greedy is unsafe here: use DP.'),
            bug('Spot the bug: merge intervals', 'This gives wrong results on unsorted input. Which line is the problem?',
              ['function merge(intervals):', '  result = []', '  for cur in intervals:', '    if result is empty or result.last.end < cur.start: result.append(cur)', '    else: result.last.end = max(result.last.end, cur.end)', '  return result'], 2,
              'Intervals must be sorted by start first, or a later-starting interval can be processed before an earlier one.'),
            ...gen('intervals', 3)]
        }
      ]
    },
    {
      id: 'trees-graphs', title: 'Trees & Graphs', icon: '🌳', color: '#34d399', blurb: 'Model relationships, traverse them, and find the best route.',
      levels: [
        {
          id: 'trees', title: 'Trees & Traversals', icon: '🌲', skill: 'tree', blurb: 'Four ways to walk a tree.',
          lesson: [
            { h: 'Binary search trees', p: 'In a BST, left < node < right. Searching follows one branch, so it is **O(log n) if balanced** but **O(n) if skewed** (e.g. inserting sorted data).' },
            { h: 'The traversals', p: '**Pre-order**: root, left, right. **In-order**: left, root, right (**sorted** for a BST). **Post-order**: left, right, root. **Level-order**: row by row using a queue (BFS).' }
          ],
          items: [
            mcq('Which traversal of a BST visits the values in **sorted order**?', ['Pre-order', 'In-order', 'Post-order', 'Level-order'], 1, 'In-order visits left subtree, node, right subtree: ascending for a BST.'),
            mcq('You insert 1, 2, 3, 4, 5 **in that order** into an empty BST. What is the cost of a later search?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 2, 'Every node goes right, so the tree is a linked list of height n.'),
            O.bstInsert,
            bug('Spot the bug: BST search', 'This search misses keys that are in the tree. Which line is wrong?',
              ['function search(node, key):', '  if node is null: return false', '  if key == node.val: return true', '  if key < node.val: return search(node.right, key)', '  return search(node.left, key)'], 3,
              'Smaller keys live in the LEFT subtree. The branches are swapped.'),
            ...gen('tree', 3)]
        },
        {
          id: 'bfsdfs', title: 'BFS & DFS', icon: '🕸️', skill: 'graph', blurb: 'Explore graphs level by level or branch by branch.',
          lesson: [
            { h: 'Graphs', p: 'Nodes joined by edges. Store as an **adjacency list**. Mark nodes **visited** or you will loop forever.' },
            { h: 'BFS vs DFS', p: '**BFS** uses a **queue**: explores in rings, so it finds the **fewest-steps** path when every step costs the same. **DFS** uses a **stack / recursion**: dives deep first, ideal for connectivity, islands, and cycle detection.' }
          ],
          items: [S.maze, S.islands, O.bfs,
            mcq('BFS uses a ____ and DFS uses a ____.', ['stack; queue', 'queue; stack', 'heap; queue', 'queue; heap'], 1, 'BFS = queue (oldest first). DFS = stack or recursion (newest first).'),
            ...gen('bfs', 2), ...gen('dfs', 2)]
        },
        {
          id: 'shortest', title: 'Shortest Paths', icon: '🗺️', skill: 'dijkstra', blurb: 'Weighted edges and cheapest routes.',
          lesson: [
            { h: 'When BFS is not enough', p: 'BFS counts **hops**. When edges have **different costs**, the fewest-hops route may be expensive. Use **Dijkstra**.' },
            { h: "Dijkstra's idea", p: 'Keep a min-heap of (distance, node). Pop the closest, **relax** its edges: if `dist[u] + w < dist[v]`, update. Cost **O(E log V)**. It requires **non-negative** weights.' }
          ],
          items: [S.route, O.dijkstra,
            mcq('Which situation breaks Dijkstra?', ['Edges with weight 0', 'Edges with negative weights', 'A graph with a cycle', 'A disconnected graph'], 1, 'A negative edge can make an already-settled node cheaper later. Use Bellman-Ford instead.'),
            bug("Spot the bug: Dijkstra", 'This code gives wrong distances. Which line is the problem?',
              ['dist[start] = 0; others = infinity; push (0, start)', 'while heap is not empty:', '  (d, u) = pop smallest', '  for (v, w) in neighbors(u):', '    dist[v] = d + w', '    push (dist[v], v)'], 4,
              'Update only when it improves: if d + w < dist[v]. Otherwise a longer path can overwrite a shorter one.'),
            ...gen('dijkstra', 3)]
        },
        {
          id: 'uf-topo', title: 'Union-Find & Topo Sort', icon: '🔗', skill: 'uf', blurb: 'Merging groups and ordering dependencies.',
          lesson: [
            { h: 'Union-Find', p: 'Tracks which items share a group. **find** returns the group leader; **union** merges groups. With **path compression** each op is nearly O(1).' },
            { h: 'Topological sort', p: 'Orders a **DAG** so each node comes after its prerequisites. Repeatedly take nodes with **in-degree 0**. If some nodes are never freed, there is a **cycle**.' }
          ],
          items: [S.friends, S.courses, O.unionFind, O.topo,
            mcq('Kahn\'s algorithm finishes but placed only 4 of 6 courses. What does that mean?', ['The input was sorted', 'There is a dependency cycle', 'It ran out of memory', 'The graph is a tree'], 1, 'Nodes in a cycle never reach in-degree 0, so they are never placed.'),
            ...gen('topo', 3)]
        }
      ]
    },
    {
      id: 'optimization', title: 'Optimization', icon: '⚙️', color: '#fbbf24', blurb: 'Enumerate possibilities cleverly, then stop recomputing the same work.',
      levels: [
        {
          id: 'backtrack', title: 'Recursion & Backtracking', icon: '↩️', skill: 'backtrack', blurb: 'Choose, explore, undo.',
          lesson: [
            { h: 'Recursion', p: 'A function that solves a problem by solving a **smaller copy** of it. Every recursion needs a **base case** and progress toward it.' },
            { h: 'Backtracking', p: 'Build a candidate **one choice at a time**. After exploring, **undo** the choice and try the next. Use it to enumerate permutations, subsets and combinations. Prune branches that cannot work.' },
            { h: 'Know the size', p: 'Subsets: **2ⁿ**. Permutations: **n!**. Naive recursive Fibonacci: also exponential, which is why DP exists.' }
          ],
          items: [S.perms, O.perms,
            bug('Spot the bug: permutations', 'This produces wrong permutations after the first one. Which line is incomplete?',
              ['function permute(path, used):', '  if len(path) == n: record(path); return', '  for x in items:', '    if x in used: continue', '    path.append(x); used.add(x)', '    permute(path, used)', '    path.pop()'], 6,
              'Undo must reverse EVERY change. `used.remove(x)` is missing, so x stays marked as used.'),
            mcq('How many subsets does a 10-element set have?', ['100', '1,024', '3,628,800', '20'], 1, '2¹⁰ = 1,024. Each element is in or out.'),
            ...gen('count', 3)]
        },
        {
          id: 'dp1', title: 'Dynamic Programming I', icon: '🧱', skill: 'dp', blurb: 'Reuse answers to smaller subproblems.',
          lesson: [
            { h: 'Two ingredients', p: '**Optimal substructure** (the best answer is built from best answers to smaller parts) and **overlapping subproblems** (the same part is needed many times). Then store each answer once.' },
            { h: 'Recipe', p: '1) Define what `dp[i]` means. 2) Write the transition. 3) Set base cases. 4) Choose the order so dependencies are ready. 5) Read the answer.' },
            { h: 'DP vs greedy', p: 'If a greedy choice can be proven safe, it is faster. If a counter-example exists (coins {1,3,4}), use DP.' }
          ],
          items: [S.coins, O.coins,
            mcq('You can climb a staircase by 1 or 2 steps. How many distinct ways to climb **5** stairs?', ['5', '8', '10', '13'], 1, 'ways(n) = ways(n−1) + ways(n−2): 1, 2, 3, 5, 8. It is Fibonacci.'),
            mcq('Which clue most strongly signals **DP** instead of greedy?', ['Data is sorted', 'The same subproblem is solved repeatedly', 'You need a shortest path in a grid with equal costs', 'Input is a stream'], 1, 'Repeated subproblems with optimal substructure are the DP signal.'),
            ...gen('kadane', 2), ...gen('coin', 2)]
        },
        {
          id: 'dp2', title: 'Dynamic Programming II', icon: '🧩', skill: 'dp2', blurb: 'Tables over two dimensions.',
          lesson: [
            { h: 'Two-dimensional tables', p: 'When the state has **two parameters** (a row and column, or a prefix of each of two strings), use a table `dp[i][j]`.' },
            { h: 'Grid paths', p: 'Paths to a cell = paths from above + paths from the left. Blocked cells hold 0. Cost: O(rows × cols).' },
            { h: 'String DP', p: 'Longest common subsequence: if the characters match, `dp[i][j] = dp[i−1][j−1] + 1`, else `max(dp[i−1][j], dp[i][j−1])`.' }
          ],
          items: [S.lcs, O.grid,
            bug('Spot the bug: grid DP', 'This crashes on the first row and column. Which line?',
              ['dp = table of 0s (R × C); dp[0][0] = 1', 'for r in 0..R-1:', '  for c in 0..C-1:', '    if blocked(r, c): dp[r][c] = 0; continue', '    dp[r][c] = dp[r-1][c] + dp[r][c-1]', 'return dp[R-1][C-1]'], 4,
              'On the edges r−1 or c−1 is out of bounds. Treat missing neighbours as 0 and keep dp[0][0] = 1.'),
            ...gen('dpGrid', 3)]
        }
      ]
    },
    {
      id: 'advanced', title: 'Advanced Toolkit', icon: '🧰', color: '#fb7185', blurb: 'Specialised structures and tricks that separate good from great.',
      levels: [
        {
          id: 'tries', title: 'Tries & Strings', icon: '🔤', skill: 'trie', blurb: 'Prefix trees for fast string lookups.',
          lesson: [
            { h: 'A tree of letters', p: 'A **trie** stores words along paths, one letter per edge. Words sharing a prefix share a path. Insert and lookup cost **O(L)** where L is the word length, independent of dictionary size.' },
            { h: 'Use cases', p: 'Autocomplete, spell-check, prefix counting, longest common prefix, word-search puzzles.' }
          ],
          items: [S.autocomplete, O.trie,
            mcq('You insert 100,000 words into a trie. How long does it take to check whether the word "cat" is present?', ['O(100,000)', 'O(log 100,000)', 'O(3)', 'O(3 × 100,000)'], 2, 'You follow at most one edge per letter: O(L) = 3 steps, regardless of dictionary size.'),
            mcq('Which task is a **trie** best suited to?', ['Finding the median of numbers', 'All words starting with a given prefix', 'Shortest path between cities', 'Sorting integers'], 1, 'Following the prefix leads directly to the subtree of every match.')]
        },
        {
          id: 'prefix', title: 'Prefix Sums & Bits', icon: '➕', skill: 'prefix', blurb: 'Precompute once, answer instantly.',
          lesson: [
            { h: 'Prefix sums', p: 'Precompute `P[k]` = sum of the first k items. Any range sum is `P[j+1] − P[i]`: **O(1)** per query after O(n) setup.' },
            { h: 'Bit tricks', p: '`x ^ x = 0` and `x ^ 0 = x`, so XOR-ing everything cancels pairs. `n & (n−1)` clears the lowest set bit. `n & 1` tests oddness.' }
          ],
          items: [S.rangeSum, O.prefix, ...gen('prefixSum', 2), ...gen('bits', 2)]
        },
        {
          id: 'mixed', title: 'Pattern Recognition', icon: '🧠', skill: 'mix', blurb: 'Mixed problems. Identify the technique from the story.',
          lesson: [
            { h: 'The interview skill', p: 'The hardest step is not coding, it is **recognising which pattern applies**. Read for constraints (sorted? size? memory limit?) and verbs (shortest, all, count, merge).' },
            { h: 'Checklist', p: 'Sorted → binary search / two pointers. Shortest path → BFS / Dijkstra. All arrangements → backtracking. Overlapping subproblems → DP. Top-k → heap. Groups merging → union-find. Prefix queries → trie.' }
          ],
          items: [S.twoSum, S.firstBad, S.friends, S.coins, S.autocomplete, S.route, S.topK, S.islands]
        }
      ]
    }
  ];

  /* ---- codex (reference cards) ---- */
  const CODEX = [
    { n: 'Hash map / set', i: '🗂️', use: 'Remember what you have seen; look up by key.', c: 'O(1) avg per op', l: 'hashing' },
    { n: 'Two pointers', i: '👉👈', use: 'Sorted data, pairs, tight memory.', c: 'O(n)', l: 'twoptr' },
    { n: 'Sliding window', i: '🪟', use: 'Contiguous stretch with a rule that can break.', c: 'O(n)', l: 'twoptr' },
    { n: 'Fast & slow pointers', i: '🐢', use: 'Cycles and midpoints in linked lists.', c: 'O(n), O(1) memory', l: 'twoptr' },
    { n: 'Stack', i: '📚', use: 'Most recent first: matching, undo, DFS, next greater.', c: 'O(1) push/pop', l: 'stack' },
    { n: 'Queue', i: '🚶', use: 'Arrival order: scheduling and BFS.', c: 'O(1) enqueue/dequeue', l: 'stack' },
    { n: 'Binary search', i: '✂️', use: 'Sorted data or a monotonic yes/no answer.', c: 'O(log n)', l: 'bsearch' },
    { n: 'Sorting', i: '🔀', use: 'Order data so a sweep or binary search works.', c: 'O(n log n)', l: 'sorting' },
    { n: 'Heap', i: '⛰️', use: 'Repeatedly need the min or max; top-k.', c: 'O(log n) insert/extract', l: 'heaps' },
    { n: 'Greedy', i: '🎯', use: 'A provably safe local choice (intervals, scheduling).', c: 'Often O(n log n)', l: 'greedy' },
    { n: 'Binary tree / BST', i: '🌲', use: 'Hierarchical data; ordered lookups.', c: 'O(log n) balanced, O(n) skewed', l: 'trees' },
    { n: 'BFS', i: '🌊', use: 'Fewest steps when every step costs the same.', c: 'O(V + E)', l: 'bfsdfs' },
    { n: 'DFS', i: '🕳️', use: 'Connectivity, islands, cycle detection.', c: 'O(V + E)', l: 'bfsdfs' },
    { n: 'Dijkstra', i: '🗺️', use: 'Cheapest path with non-negative weights.', c: 'O(E log V)', l: 'shortest' },
    { n: 'Union-Find', i: '🔗', use: 'Dynamic groups; are two items connected?', c: '≈ O(1) per op', l: 'uf-topo' },
    { n: 'Topological sort', i: '📋', use: 'Order by dependencies; detect cycles.', c: 'O(V + E)', l: 'uf-topo' },
    { n: 'Backtracking', i: '↩️', use: 'Enumerate permutations, subsets, combinations.', c: 'O(n!) / O(2ⁿ)', l: 'backtrack' },
    { n: 'Dynamic programming', i: '🧱', use: 'Overlapping subproblems with optimal substructure.', c: 'States × transitions', l: 'dp1' },
    { n: 'Trie', i: '🌳', use: 'Prefix queries over many strings.', c: 'O(L) per word', l: 'tries' },
    { n: 'Prefix sums', i: '➕', use: 'Many range queries on unchanging data.', c: 'O(n) build, O(1) query', l: 'prefix' }
  ];
  const STRUCTS = [
    ['Array', 'O(1)', 'O(n)', 'O(n)', 'O(n)'],
    ['Linked list', 'O(n)', 'O(n)', 'O(1) at head', 'O(1) with node'],
    ['Hash map', 'n/a', 'O(1) avg', 'O(1) avg', 'O(1) avg'],
    ['Stack / queue', 'O(n)', 'O(n)', 'O(1)', 'O(1)'],
    ['Balanced BST', 'O(log n)', 'O(log n)', 'O(log n)', 'O(log n)'],
    ['Min-heap', 'O(1) min', 'O(n)', 'O(log n)', 'O(log n) min']
  ];

  /* ---- badges ---- */
  const BADGES = [
    { id: 'first', n: 'First Steps', i: '🌱', d: 'Complete your first level.' },
    { id: 'perfect', n: 'Flawless', i: '💎', d: 'Earn 3 stars on a level.' },
    { id: 'streak3', n: 'On Fire', i: '🔥', d: 'Keep a 3-day streak.' },
    { id: 'streak7', n: 'Unstoppable', i: '⚡', d: 'Keep a 7-day streak.' },
    { id: 'boss', n: 'Boss Slayer', i: '👑', d: 'Defeat a chapter boss.' },
    { id: 'five', n: 'Getting Serious', i: '📚', d: 'Complete 5 levels.' },
    { id: 'ten', n: 'Pattern Master', i: '🧠', d: 'Complete 10 levels.' },
    { id: 'xp1k', n: 'Four Digits', i: '💯', d: 'Earn 1,000 XP.' },
    { id: 'arena5', n: 'Arena Contender', i: '🏟️', d: 'Reach tier 5 in the Endless Arena.' },
    { id: 'arena10', n: 'Arena Legend', i: '🏆', d: 'Reach tier 10 in the Endless Arena.' }
  ];
  const RANKS = ['Rookie', 'Apprentice', 'Coder', 'Problem Solver', 'Strategist', 'Engineer', 'Architect', 'Expert', 'Master', 'Grandmaster'];

  const api = { CHAPTERS, CODEX, STRUCTS, BADGES, RANKS, S, O };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AFContent = api;
})(typeof window !== 'undefined' ? window : globalThis);
