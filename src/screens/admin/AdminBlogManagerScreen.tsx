import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import { Theme } from '../../theme/tokens';
import * as adminService from '../../services/adminService';

const EMPTY_BLOG = {
  title: '',
  date: '',
  author: '',
  image: '',
  category: '',
  desc: '',
  content: '',
  url: '',
  status: 'draft',
  featured: false,
};

export default function AdminBlogManagerScreen() {
  const navigation = useNavigation();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_BLOG);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const data = await adminService.getAdminBlogs();
      setBlogs(data);
    } catch (err: any) {
      const message = err?.message || 'Failed to load blogs';
      setLoadError(message);
      setBlogs([]);
      console.warn('[BlogManager] load failed:', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(EMPTY_BLOG);
    setEditingId(null);
    setShowEditor(false);
  };

  const openCreate = () => {
    setForm(EMPTY_BLOG);
    setEditingId(null);
    setShowEditor(true);
  };

  const openEdit = (blog: any) => {
    setEditingId(String(blog.id));
    setForm({
      title: blog.title || '',
      date: blog.date || '',
      author: blog.author || '',
      image: blog.image || '',
      category: blog.category || '',
      desc: blog.desc || '',
      content: blog.content || '',
      url: blog.url || '',
      status: blog.status || 'draft',
      featured: Boolean(blog.featured),
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Please enter a blog title.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await adminService.updateAdminBlog(editingId, form);
      } else {
        await adminService.createAdminBlog(form);
      }
      resetForm();
      await load();
      Alert.alert('Success', editingId ? 'Blog updated.' : 'Blog created.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (blog: any) => {
    Alert.alert('Delete blog', `Delete "${blog.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteAdminBlog(String(blog.id));
            await load();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete blog');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <StandardPageHeader
          scrollWithContent
          title="Blog Manager"
          subtitle="Create and manage website blogs"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={openCreate}
              accessibilityLabel="Add blog"
            >
              <Plus size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          ) : loadError ? (
            <AdminEmptyState
              icon={<BookOpen size={28} color={Theme.colors.error} />}
              title="Could not load blogs"
              description={loadError}
              actionLabel="Retry"
              onAction={() => {
                setLoading(true);
                load();
              }}
            />
          ) : blogs.length === 0 ? (
            <AdminEmptyState
              icon={<BookOpen size={28} color={Theme.colors.primary} />}
              title="No blogs yet"
              description="Publish articles for your website. Tap Add to create your first blog post."
              actionLabel="Add Blog"
              onAction={openCreate}
            />
          ) : (
            blogs.map(blog => (
              <AppCard key={String(blog.id)} style={styles.blogCard}>
                <View style={styles.blogHeader}>
                  <View style={{ flex: 1 }}>
                    <AppText weight="bold" style={styles.blogTitle}>{blog.title}</AppText>
                    <AppText style={styles.blogMeta}>
                      {blog.author || 'Unknown'} · {blog.status || 'draft'}
                      {blog.category ? ` · ${blog.category}` : ''}
                      {blog.featured ? ' · Featured' : ''}
                    </AppText>
                    {!!blog.desc && <AppText style={styles.blogDesc} numberOfLines={2}>{blog.desc}</AppText>}
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity accessibilityRole="button" onPress={() => openEdit(blog)} style={styles.iconBtn}>
                      <Edit2 size={18} color={Theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" onPress={() => handleDelete(blog)} style={styles.iconBtn}>
                      <Trash2 size={18} color={Theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </AppCard>
            ))
          )}

          {showEditor && (
            <AppCard style={styles.editorCard}>
              <AppText weight="bold" style={styles.editorTitle}>{editingId ? 'Edit Blog' : 'New Blog'}</AppText>
              {(['title', 'date', 'author', 'category', 'image', 'url', 'desc'] as const).map(field => (
                <View key={field} style={styles.field}>
                  <AppText style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</AppText>
                  <TextInput
                    style={styles.input}
                    value={(form as any)[field]}
                    onChangeText={text => setForm(prev => ({ ...prev, [field]: text }))}
                    placeholder={`Enter ${field}`}
                    autoCapitalize={field === 'url' || field === 'image' ? 'none' : 'sentences'}
                  />
                </View>
              ))}
              <View style={styles.field}>
                <AppText style={styles.label}>Content</AppText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.content}
                  onChangeText={text => setForm(prev => ({ ...prev, content: text }))}
                  multiline
                  numberOfLines={6}
                  placeholder="Blog content"
                />
              </View>
              <View style={styles.switchRow}>
                <AppText>Featured</AppText>
                <Switch value={form.featured} onValueChange={v => setForm(prev => ({ ...prev, featured: v }))} />
              </View>
              <View style={styles.switchRow}>
                <AppText>Published</AppText>
                <Switch
                  value={form.status === 'published'}
                  onValueChange={v => setForm(prev => ({ ...prev, status: v ? 'published' : 'draft' }))}
                />
              </View>
              <View style={styles.editorActions}>
                <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={resetForm}>
                  <AppText weight="semibold">Cancel</AppText>
                </TouchableOpacity>
                <AppButton title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} style={{ flex: 1 }} />
              </View>
            </AppCard>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  blogCard: { marginTop: 12 },
  blogHeader: { flexDirection: 'row', gap: 12 },
  blogTitle: { fontSize: 16, color: Theme.colors.text },
  blogMeta: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },
  blogDesc: { fontSize: 13, color: Theme.colors.textSec, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  editorCard: { marginTop: 20 },
  editorTitle: { fontSize: 18, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Theme.colors.card,
    color: Theme.colors.text,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  editorActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: Theme.colors.card,
  },
});
