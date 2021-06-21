# Creating a New Tag

To create a new tag, do the following:

1. Fill out `git_annotated_tag_template`.
2. Run the following command:

   ```
   git tag -a -F git_annotated_tag_template -s --cleanup=verbatim <tagname> [<commit>]
   ```

3. Restore `git_annotated_tag_template` to its original state:

   ```
   git restore git_annotated_tag_template
   ```

4. Push the new tag.

   ```
   git push --tags
   ```
