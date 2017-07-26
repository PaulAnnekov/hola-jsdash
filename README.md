Results
=======

- T - timeout
- F - frozen
- S - skips

Pre 1
-----

|total|2      |8  |20 |28 |50 |82 |126   |
|:---:|-------|---|---|---|---|---|------|
|86abb554b4565599a918d721275b8d36633ef8c2|
|295  |96     |0  |22 |83 |73 |7  |14    |
|bbcabc116f1a05eb316fbb41102106931df3149c|
|542  |96     |196|74 |83 |73 |6  |14    |
|6551350b90907ae02cb997f55db92db95f87b19f|
|933  |108    |0  |458|218|128|7  |14    |
|0b6a37fecd154c1e5ca4bb41c54605a4e4f55556|
|1553 |104 (F)|193|458|218|194|272|114   |

Pre 2
-----

|total |1066   | 1145 | 1222 | 1301    | 1378 | 1456 |1531      | 1607  |1682   | 1758    | 1835   | 1910    | 1986   |
|:----:|-------|------|------|---------|------|------|----------|-------|-------|---------|--------|---------|--------|
|c17294cbf3a82a0f200bfe993cff5c6fce582a2a (c3.large)                                                                  |
| 3051 |327    |406   | 235  | 307 (T) |  233 | 130  |  254 (F) | 120   |  163  | 192 (F) | 251    | 135 (S) | 298    |


TODO
----

- [ ] Make player move "0"s.
- [x] Fix worker execution mode.
- [x] Calc ways to 2 targets ahead to prevent to be killed when got 1st target (seed 82, 126).
- [x] What to do with diamonds that are moving? They can kill us (seed 8).
- [x] Optimize performance of all places which are using Iterators.
- [x] maxStatesPerControl for c3.large.
- [ ] Kill butterflies.
- [ ] Optimize movements for streaks.
- [ ] 1607 seed weird right bottom corner.
